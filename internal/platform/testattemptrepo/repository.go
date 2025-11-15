package testattemptrepo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	domain "edu-system/internal/testAttempt"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repo struct {
	db *gorm.DB
}

func NewTestAttemptRepository(db *gorm.DB) *Repo { return &Repo{db: db} }

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(&attemptRow{}, &answerRow{})
}

func (r *Repo) Create(ctx context.Context, a *domain.Attempt) (domain.AttemptID, error) {
	row, err := toRow(a)
	if err != nil {
		return "", err
	}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return "", err
	}
	return domain.AttemptID(row.ID), nil
}

func (r *Repo) GetByID(ctx context.Context, id domain.AttemptID) (*domain.Attempt, error) {
	var row attemptRow
	if err := r.db.WithContext(ctx).Preload("Answers").First(&row, "id = ?", string(id)).Error; err != nil {
		return nil, translateErr(err)
	}
	return toDomain(&row)
}

func (r *Repo) GetActiveByUserAndAssignment(ctx context.Context, user domain.UserID, assignment domain.AssignmentID) (*domain.Attempt, error) {
	var row attemptRow
	err := r.db.WithContext(ctx).
		Preload("Answers").
		Where("user_id = ? AND assignment_id = ? AND status = ?", uint64(user), string(assignment), string(domain.StatusActive)).
		First(&row).Error
	if err != nil {
		return nil, translateErr(err)
	}
	return toDomain(&row)
}

func (r *Repo) SaveAnswer(ctx context.Context, a *domain.Attempt, answered domain.QuestionID) error {
	row, err := toRow(a)
	if err != nil {
		return err
	}
	var ar answerRow
	for _, x := range row.Answers {
		if x.QuestionID == string(answered) {
			ar = x
			break
		}
	}
	if ar.AttemptID == "" {
		return errors.New("answer row not prepared")
	}
	ar.ID = uuid.NewString()
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&attemptRow{}).
			Where("id = ?", row.ID).
			Updates(map[string]any{
				"version":            row.Version,
				"cursor":             row.Cursor,
				"status":             row.Status,
				"expired_at":         row.ExpiredAt,
				"question_opened_at": row.QuestionOpenedAt,
			}).Error; err != nil {
			return err
		}
		return tx.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "attempt_id"}, {Name: "question_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"payload", "is_correct", "score", "updated_at"}),
		}).Create(&ar).Error
	})
}

func (r *Repo) SaveProgress(ctx context.Context, a *domain.Attempt) error {
	row, err := toRow(a)
	if err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&attemptRow{}).
		Where("id = ?", row.ID).
		Updates(map[string]any{
			"version":            row.Version,
			"cursor":             row.Cursor,
			"status":             row.Status,
			"expired_at":         row.ExpiredAt,
			"question_opened_at": row.QuestionOpenedAt,
		}).Error
}

func (r *Repo) Submit(ctx context.Context, a *domain.Attempt) error {
	row, err := toRow(a)
	if err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&attemptRow{}).
		Where("id = ?", row.ID).
		Updates(map[string]any{
			"status":       row.Status,
			"submitted_at": row.SubmittedAt,
			"score":        row.Score,
			"max_score":    row.MaxScore,
			"version":      row.Version,
		}).Error
}

func (r *Repo) Cancel(ctx context.Context, a *domain.Attempt) error {
	row, err := toRow(a)
	if err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&attemptRow{}).
		Where("id = ?", row.ID).
		Updates(map[string]any{
			"status":  row.Status,
			"version": row.Version,
		}).Error
}

func (r *Repo) ListSummariesByAssignments(ctx context.Context, assignments []domain.AssignmentID) ([]domain.AttemptSummary, error) {
	if len(assignments) == 0 {
		return []domain.AttemptSummary{}, nil
	}
	ids := make([]string, len(assignments))
	for i, id := range assignments {
		ids[i] = string(id)
	}
	var rows []attemptRow
	if err := r.db.WithContext(ctx).
		Where("assignment_id IN ?", ids).
		Order("started_at DESC").
		Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]domain.AttemptSummary, 0, len(rows))
	for _, row := range rows {
		out = append(out, domain.AttemptSummary{
			AttemptID:    domain.AttemptID(row.ID),
			AssignmentID: domain.AssignmentID(row.AssignmentID),
			TestID:       domain.TestID(row.TestID),
			UserID:       domain.UserID(row.UserID),
			GuestName:    row.GuestName,
			Status:       domain.AttemptStatus(row.Status),
			StartedAt:    row.StartedAt,
			SubmittedAt:  row.SubmittedAt,
			ExpiredAt:    row.ExpiredAt,
			Duration:     time.Duration(row.DurationSec) * time.Second,
			Score:        row.Score,
			MaxScore:     row.MaxScore,
		})
	}
	return out, nil
}

func (r *Repo) CountAttempts(ctx context.Context, filter domain.AttemptCountFilter) (domain.AttemptCounts, error) {
	counts := domain.AttemptCounts{}
	assignmentID := string(filter.Assignment)
	if assignmentID == "" {
		return counts, nil
	}

	if filter.User != nil {
		c, err := r.countAttempts(ctx, assignmentID, func(tx *gorm.DB) *gorm.DB {
			return tx.Where("user_id = ?", uint64(*filter.User))
		})
		if err != nil {
			return counts, err
		}
		counts.ByUser = c
	}
	if filter.GuestName != nil && *filter.GuestName != "" {
		c, err := r.countAttempts(ctx, assignmentID, func(tx *gorm.DB) *gorm.DB {
			return tx.Where("user_id = 0").Where("guest_name = ?", *filter.GuestName)
		})
		if err != nil {
			return counts, err
		}
		counts.ByGuest = c
	}
	if filter.ClientFingerprint != "" {
		c, err := r.countAttempts(ctx, assignmentID, func(tx *gorm.DB) *gorm.DB {
			return tx.Where("client_fingerprint = ?", filter.ClientFingerprint)
		})
		if err != nil {
			return counts, err
		}
		counts.ByFingerprint = c
	}
	if filter.ClientIP != "" {
		c, err := r.countAttempts(ctx, assignmentID, func(tx *gorm.DB) *gorm.DB {
			return tx.Where("client_ip = ?", filter.ClientIP)
		})
		if err != nil {
			return counts, err
		}
		counts.ByIP = c
	}
	return counts, nil
}

func (r *Repo) countAttempts(ctx context.Context, assignmentID string, where func(*gorm.DB) *gorm.DB) (int, error) {
	var total int64
	base := r.db.WithContext(ctx).Model(&attemptRow{}).
		Where("assignment_id = ?", assignmentID).
		Where("status <> ?", string(domain.StatusCanceled))
	if err := where(base).Count(&total).Error; err != nil {
		return 0, err
	}
	return int(total), nil
}

type attemptRow struct {
	ID           string `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
	AssignmentID string    `gorm:"not null;type:varchar(36);index"`
	TestID       string    `gorm:"not null;type:varchar(36);index"`
	UserID       uint64    `gorm:"not null;index"` // 0 = guest
	GuestName    *string   `gorm:"type:varchar(64);null"`
	StartedAt    time.Time `gorm:"not null;index"`
	SubmittedAt  *time.Time
	ExpiredAt    *time.Time
	Status       string  `gorm:"type:varchar(16);not null;default:'active';index"`
	DurationSec  int     `gorm:"not null;default:0"`
	Version      int     `gorm:"not null;default:0;version"`
	Seed         int64   `gorm:"not null;default:0"`
	Score        float64 `gorm:"not null;default:0"`
	MaxScore     float64 `gorm:"not null;default:0"`

	ClientIP          string `gorm:"type:varchar(64)"`
	ClientFingerprint string `gorm:"type:varchar(128)"`
	QuestionOpenedAt  *time.Time
	PolicyJSON        json.RawMessage `gorm:"type:json;not null;default:'{}'"`
	OrderJSON         json.RawMessage `gorm:"type:json;not null"`
	Cursor            int             `gorm:"not null;default:0"`

	Answers []answerRow `gorm:"foreignKey:AttemptID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (attemptRow) TableName() string { return "test_attempts" }

type answerRow struct {
	ID         string `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	AttemptID  string          `gorm:"not null;type:varchar(36);index;uniqueIndex:ux_attempt_question,priority:1"`
	QuestionID string          `gorm:"not null;type:varchar(36);uniqueIndex:ux_attempt_question,priority:2"`
	Payload    json.RawMessage `gorm:"type:json;not null"`
	IsCorrect  *bool           `gorm:"index"`
	Score      *float64
}

func (answerRow) TableName() string { return "selected_answers" }

func toRow(a *domain.Attempt) (*attemptRow, error) {
	score, max := a.Score()

	policy := a.Policy()
	policyJSON, err := json.Marshal(policy)
	if err != nil {
		return nil, err
	}

	order := aOrder(a)
	orderJSON, err := json.Marshal(order)
	if err != nil {
		return nil, err
	}

	arows := make([]answerRow, 0, len(a.Answers()))
	for qid, ans := range a.Answers() {
		payload, err := payloadToJSON(ans.Payload)
		if err != nil {
			return nil, err
		}
		arows = append(arows, answerRow{
			AttemptID:  string(a.ID()),
			QuestionID: string(qid),
			Payload:    payload,
			IsCorrect:  ans.IsCorrect,
			Score:      ans.Score,
		})
	}

	var gname *string
	if a.GuestName() != nil {
		n := *a.GuestName()
		gname = &n
	}
	var submitted *time.Time
	if a.SubmittedAt() != nil {
		t := a.SubmittedAt().UTC()
		submitted = &t
	}
	var expired *time.Time
	if a.ExpiredAt() != nil {
		t := a.ExpiredAt().UTC()
		expired = &t
	}
	var openedAt *time.Time
	if ts := a.CurrentQuestionOpenedAt(); ts != nil {
		t := ts.UTC()
		openedAt = &t
	}

	return &attemptRow{
		ID:                string(a.ID()),
		AssignmentID:      string(a.Assignment()),
		TestID:            string(a.Test()),
		UserID:            uint64(a.User()),
		GuestName:         gname,
		StartedAt:         a.StartedAt(),
		SubmittedAt:       submitted,
		ExpiredAt:         expired,
		Status:            string(a.Status()),
		DurationSec:       int(a.Duration() / time.Second),
		Version:           a.Version(),
		Seed:              a.Seed(),
		Score:             score,
		MaxScore:          max,
		ClientIP:          a.ClientIP(),
		ClientFingerprint: a.ClientFingerprint(),
		QuestionOpenedAt:  openedAt,

		PolicyJSON: policyJSON,
		OrderJSON:  orderJSON,
		Cursor:     a.Cursor(),
		Answers:    arows,
	}, nil
}

func toDomain(r *attemptRow) (*domain.Attempt, error) {
	var policy domain.AttemptPolicy
	if len(r.PolicyJSON) > 0 {
		if err := json.Unmarshal(r.PolicyJSON, &policy); err != nil {
			return nil, err
		}
	}
	if len(r.PolicyJSON) == 0 || string(r.PolicyJSON) == "{}" {
		policy.ShuffleQuestions = true
		policy.ShuffleAnswers = true
	}
	if policy.MaxAttemptTime == 0 && r.DurationSec > 0 {
		policy.MaxAttemptTime = time.Duration(r.DurationSec) * time.Second
	}

	var ids []string
	if err := json.Unmarshal(r.OrderJSON, &ids); err != nil {
		return nil, err
	}
	plan := make([]domain.QuestionID, len(ids))
	for i, s := range ids {
		plan[i] = domain.QuestionID(s)
	}

	answers := make(map[domain.QuestionID]domain.Answer, len(r.Answers))
	for _, row := range r.Answers {
		payload, err := jsonToPayload([]byte(row.Payload))
		if err != nil {
			return nil, err
		}
		qid := domain.QuestionID(row.QuestionID)
		answers[qid] = domain.Answer{
			QuestionID: qid,
			Payload:    payload,
			IsCorrect:  row.IsCorrect,
			Score:      row.Score,
		}
	}

	attempt, err := domain.RehydrateAttempt(
		domain.AttemptID(r.ID),
		domain.AssignmentID(r.AssignmentID),
		domain.TestID(r.TestID),
		domain.UserID(r.UserID),
		r.GuestName,
		r.StartedAt,
		policy,
		r.Seed,
		plan,
		r.Cursor,
		answers,
		domain.AttemptStatus(r.Status),
		r.Version,
		r.SubmittedAt,
		r.ExpiredAt,
		r.Score,
		r.MaxScore,
		r.ClientIP,
		r.ClientFingerprint,
		r.QuestionOpenedAt,
	)
	if err != nil {
		return nil, err
	}

	return attempt, nil
}

func aOrder(a *domain.Attempt) []string {
	plan := a.Plan()
	out := make([]string, 0, len(plan))
	for _, id := range plan {
		out = append(out, string(id))
	}
	return out
}

// payload JSON <-> domain.

func payloadToJSON(p domain.AnswerPayload) ([]byte, error) {
	switch p.Kind {
	case domain.AnswerSingle:
		return json.Marshal(map[string]any{"selected": []int{p.Single}})
	case domain.AnswerMulti:
		return json.Marshal(map[string]any{"selected": p.Multi})
	case domain.AnswerText:
		return json.Marshal(map[string]any{"text": p.Text})
	case domain.AnswerCode:
		return json.Marshal(map[string]any{"code": map[string]string{"lang": p.Code.Lang, "body": p.Code.Body}})
	default:
		return json.Marshal(nil)
	}
}

func jsonToPayload(b []byte) (domain.AnswerPayload, error) {
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		return domain.AnswerPayload{}, err
	}
	if v, ok := m["selected"]; ok {
		arr, _ := v.([]any)
		ints := make([]int, 0, len(arr))
		for _, x := range arr {
			if f, ok := x.(float64); ok {
				ints = append(ints, int(f))
			}
		}
		if len(ints) == 1 {
			return domain.AnswerPayload{Kind: domain.AnswerSingle, Single: ints[0]}, nil
		}
		return domain.AnswerPayload{Kind: domain.AnswerMulti, Multi: ints}, nil
	}
	if v, ok := m["text"].(string); ok {
		return domain.AnswerPayload{Kind: domain.AnswerText, Text: v}, nil
	}
	if v, ok := m["code"].(map[string]any); ok {
		lang, _ := v["lang"].(string)
		body, _ := v["body"].(string)
		return domain.AnswerPayload{Kind: domain.AnswerCode, Code: &domain.CodePayload{Lang: lang, Body: body}}, nil
	}
	return domain.AnswerPayload{}, nil
}

func translateErr(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errors.New("not found")
	}
	return err
}
