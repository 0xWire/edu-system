package testAttempt

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"
)

type Clock interface{ Now() time.Time }
type Transactor interface {
	WithinTx(ctx context.Context, fn func(ctx context.Context) error) error
}
type Policy interface {
	CanStartAttempt(ctx context.Context, userID *UserID, guestName *string, testID TestID) error
	CanModifyAttempt(ctx context.Context, userID *UserID, a *Attempt) error
}

type VisibleOption struct {
	ID         string
	OptionText string
	ImageURL   string
}

type VisibleQuestion struct {
	ID           string
	QuestionText string
	ImageURL     string
	Options      []VisibleOption
}

type QuestionForScoring struct {
	ID          string
	Type        string
	Weight      float64
	CorrectJSON []byte
}

type AttemptMetadata struct {
	ClientIP    string
	Fingerprint string
}

type TestReadModel interface {
	GetTestSettings(ctx context.Context, testID string) (durationSec int, availableFrom, availableUntil *time.Time, allowGuests bool, policy AttemptPolicy, err error)
	ListVisibleQuestions(ctx context.Context, testID string) ([]VisibleQuestion, error)
	ListQuestionsForScoring(ctx context.Context, testID string) ([]QuestionForScoring, error)
}

type AssignmentReadModel interface {
	GetAssignment(ctx context.Context, id AssignmentID) (AssignmentDescriptor, error)
}

type AssignmentDescriptor struct {
	ID       AssignmentID
	TestID   TestID
	OwnerID  UserID
	Title    string
	Template *AssignmentTemplate
}

type AssignmentTemplate struct {
	TestID         TestID
	Title          string
	Description    string
	DurationSec    int
	AllowGuests    bool
	AvailableFrom  *time.Time
	AvailableUntil *time.Time
	Policy         AttemptPolicy
	Questions      []TemplateQuestion
}

type TemplateQuestion struct {
	ID            QuestionID
	QuestionText  string
	ImageURL      string
	CorrectOption int
	Options       []TemplateOption
}

type TemplateOption struct {
	ID         string
	OptionText string
	ImageURL   string
}

func (tpl *AssignmentTemplate) VisibleQuestions() []VisibleQuestion {
	if tpl == nil {
		return nil
	}
	out := make([]VisibleQuestion, 0, len(tpl.Questions))
	for _, q := range tpl.Questions {
		opts := make([]VisibleOption, 0, len(q.Options))
		for _, o := range q.Options {
			opts = append(opts, VisibleOption{
				ID:         o.ID,
				OptionText: o.OptionText,
				ImageURL:   o.ImageURL,
			})
		}
		out = append(out, VisibleQuestion{
			ID:           string(q.ID),
			QuestionText: q.QuestionText,
			ImageURL:     q.ImageURL,
			Options:      opts,
		})
	}
	return out
}

func (tpl *AssignmentTemplate) QuestionsForScoring() []QuestionForScoring {
	if tpl == nil {
		return nil
	}
	out := make([]QuestionForScoring, 0, len(tpl.Questions))
	for _, q := range tpl.Questions {
		payload, _ := json.Marshal(map[string]any{
			"selected": []int{q.CorrectOption},
		})
		out = append(out, QuestionForScoring{
			ID:          string(q.ID),
			Type:        "single",
			Weight:      1.0,
			CorrectJSON: payload,
		})
	}
	return out
}

type UserDirectory interface {
	Lookup(ctx context.Context, ids []UserID) (map[UserID]UserInfo, error)
}

type Service struct {
	repo        Repository
	tests       TestReadModel
	assignments AssignmentReadModel
	tx          Transactor
	clock       Clock
	policy      Policy
	users       UserDirectory
}

func NewTestAttemptService(repo Repository, tests TestReadModel, assignments AssignmentReadModel, tx Transactor, clock Clock, policy Policy, users UserDirectory) *Service {
	return &Service{repo: repo, tests: tests, assignments: assignments, tx: tx, clock: clock, policy: policy, users: users}
}

func (s *Service) StartAttempt(ctx context.Context, userID *UserID, guestName *string, assignmentID AssignmentID, meta AttemptMetadata) (AttemptID, error) {
	assignment, err := s.assignments.GetAssignment(ctx, assignmentID)
	if err != nil {
		return "", err
	}
	testID := assignment.TestID

	template := assignment.Template

	var (
		durationSec int
		from        *time.Time
		until       *time.Time
		policy      AttemptPolicy
	)

	if template != nil {
		durationSec = template.DurationSec
		from = template.AvailableFrom
		until = template.AvailableUntil
		policy = template.Policy
	} else {
		var allowGuests bool
		durationSec, from, until, allowGuests, policy, err = s.tests.GetTestSettings(ctx, string(testID))
		if err != nil {
			return "", err
		}
		_ = allowGuests
	}
	if err := s.policy.CanStartAttempt(ctx, userID, guestName, testID); err != nil {
		return "", fmt.Errorf("%w: %v", ErrForbidden, err)
	}
	now := s.clock.Now()
	if from != nil && now.Before(*from) {
		return "", errors.New("test not yet available")
	}
	if until != nil && now.After(*until) {
		return "", errors.New("test window expired")
	}

	if userID != nil {
		if active, err := s.repo.GetActiveByUserAndAssignment(ctx, *userID, assignmentID); err == nil && active != nil && active.ID() != "" {
			return active.ID(), nil
		}
	}

	if policy.MaxAttempts > 0 {
		counts, err := s.repo.CountAttempts(ctx, AttemptCountFilter{
			Assignment:        assignmentID,
			User:              userID,
			GuestName:         guestName,
			ClientIP:          meta.ClientIP,
			ClientFingerprint: meta.Fingerprint,
		})
		if err != nil {
			return "", err
		}
		limit := policy.MaxAttempts
		if userID != nil && counts.ByUser >= limit {
			return "", ErrMaxAttempts
		}
		if userID == nil {
			if guestName != nil && counts.ByGuest >= limit {
				return "", ErrMaxAttempts
			}
		}
		if meta.Fingerprint != "" && counts.ByFingerprint >= limit {
			return "", ErrMaxAttempts
		}
		if meta.ClientIP != "" && counts.ByIP >= limit {
			return "", ErrMaxAttempts
		}
	}

	seed := now.UnixNano() ^ int64(rand.Int())
	var uid UserID
	if userID != nil {
		uid = *userID
	}
	if policy.MaxAttemptTime <= 0 && durationSec > 0 {
		policy.MaxAttemptTime = time.Duration(durationSec) * time.Second
	}
	var vis []VisibleQuestion
	if template != nil {
		vis = template.VisibleQuestions()
	} else {
		vis, err = s.tests.ListVisibleQuestions(ctx, string(testID))
		if err != nil {
			return "", err
		}
	}

	var order []QuestionID
	if policy.ShuffleQuestions {
		order = shuffleQuestionIDs(vis, seed)
	} else {
		order = make([]QuestionID, 0, len(vis))
		for _, q := range vis {
			order = append(order, QuestionID(q.ID))
		}
	}
	if policy.MaxQuestions > 0 && len(order) > policy.MaxQuestions {
		order = order[:policy.MaxQuestions]
	}

	a := NewAttempt(NewAttemptID(), assignmentID, testID, uid, guestName, now, policy, seed, meta.ClientIP, meta.Fingerprint)

	a.InitializePlan(order)

	return s.repo.Create(ctx, a)
}

func (s *Service) NextQuestion(ctx context.Context, requester *UserID, id AttemptID) (AttemptView, QuestionView, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return AttemptView{}, QuestionView{}, err
	}
	if err := s.policy.CanModifyAttempt(ctx, requester, a); err != nil {
		return AttemptView{}, QuestionView{}, fmt.Errorf("%w: %v", ErrForbidden, err)
	}

	now := s.clock.Now()
	descriptor, err := s.assignments.GetAssignment(ctx, a.Assignment())
	if err != nil {
		return AttemptView{}, QuestionView{}, err
	}
	qid, err := a.NextQuestionID(now)
	if err != nil {
		if errors.Is(err, ErrQuestionTimeLimit) {
			_ = s.repo.SaveProgress(ctx, a)
		}
		return attemptToView(a, now), QuestionView{}, err
	}

	var vis []VisibleQuestion
	if descriptor.Template != nil {
		vis = descriptor.Template.VisibleQuestions()
	} else {
		vis, err = s.tests.ListVisibleQuestions(ctx, string(a.Test()))
		if err != nil {
			return AttemptView{}, QuestionView{}, err
		}
	}
	m := make(map[string]VisibleQuestion, len(vis))
	for _, q := range vis {
		m[q.ID] = q
	}
	vq, ok := m[string(qid)]
	if !ok {
		return AttemptView{}, QuestionView{}, errors.New("question not found in test")
	}
	options := vq.Options
	if a.Policy().ShuffleAnswers {
		options = shuffleOptions(vq.Options, a.Seed(), a.Cursor())
	}
	if err := s.repo.SaveProgress(ctx, a); err != nil {
		return AttemptView{}, QuestionView{}, err
	}

	return attemptToView(a, now), makeQuestionView(vq, options), nil
}

func (s *Service) AnswerCurrent(ctx context.Context, requester *UserID, id AttemptID, version int, payload AnswerPayload) (AttemptView, AnsweredView, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return AttemptView{}, AnsweredView{}, err
	}
	if err := s.policy.CanModifyAttempt(ctx, requester, a); err != nil {
		return AttemptView{}, AnsweredView{}, fmt.Errorf("%w: %v", ErrForbidden, err)
	}
	now := s.clock.Now()
	newVersion, qid, err := a.AnswerCurrent(version, now, payload)
	if err != nil {
		if errors.Is(err, ErrQuestionTimeLimit) {
			_ = s.repo.SaveProgress(ctx, a)
		}
		return AttemptView{}, AnsweredView{}, err
	}
	err = s.tx.WithinTx(ctx, func(ctx context.Context) error {
		return s.repo.SaveAnswer(ctx, a, qid)
	})
	if err != nil {
		return AttemptView{}, AnsweredView{}, err
	}
	av := attemptToView(a, now)
	av.Version = newVersion
	return av, AnsweredView{QuestionID: string(qid)}, nil
}

func (s *Service) ListAssignmentAttempts(ctx context.Context, requester UserID, assignmentID AssignmentID) ([]AttemptSummary, error) {
	descriptor, err := s.assignments.GetAssignment(ctx, assignmentID)
	if err != nil {
		return nil, err
	}
	if descriptor.OwnerID != requester {
		return nil, ErrForbidden
	}
	summaries, err := s.repo.ListSummariesByAssignments(ctx, []AssignmentID{assignmentID})
	if err != nil {
		return nil, err
	}
	if s.users == nil {
		return summaries, nil
	}
	idsSet := make(map[UserID]struct{})
	for _, summary := range summaries {
		if summary.UserID != 0 {
			idsSet[summary.UserID] = struct{}{}
		}
	}
	if len(idsSet) == 0 {
		return summaries, nil
	}
	ids := make([]UserID, 0, len(idsSet))
	for id := range idsSet {
		ids = append(ids, id)
	}
	profiles, err := s.users.Lookup(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range summaries {
		if info, ok := profiles[summaries[i].UserID]; ok {
			val := info
			summaries[i].User = &val
		}
	}
	return summaries, nil
}

func (s *Service) Submit(ctx context.Context, requester *UserID, id AttemptID, version int) (AttemptView, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return AttemptView{}, err
	}
	if err := s.policy.CanModifyAttempt(ctx, requester, a); err != nil {
		return AttemptView{}, fmt.Errorf("%w: %v", ErrForbidden, err)
	}
	descriptor, err := s.assignments.GetAssignment(ctx, a.Assignment())
	if err != nil {
		return AttemptView{}, err
	}
	var qs []QuestionForScoring
	if descriptor.Template != nil {
		qs = descriptor.Template.QuestionsForScoring()
	} else {
		qs, err = s.tests.ListQuestionsForScoring(ctx, string(a.Test()))
		if err != nil {
			return AttemptView{}, err
		}
	}
	score, max, err := simpleScore(qs, a.Answers())
	if err != nil {
		return AttemptView{}, err
	}
	_, err = a.Submit(version, s.clock.Now(), score, max)
	if err != nil {
		return AttemptView{}, err
	}
	err = s.tx.WithinTx(ctx, func(ctx context.Context) error {
		return s.repo.Submit(ctx, a)
	})
	if err != nil {
		return AttemptView{}, err
	}
	return attemptToView(a, s.clock.Now()), nil
}

func (s *Service) Cancel(ctx context.Context, requester *UserID, id AttemptID, version int) (AttemptView, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return AttemptView{}, err
	}
	if err := s.policy.CanModifyAttempt(ctx, requester, a); err != nil {
		return AttemptView{}, fmt.Errorf("%w: %v", ErrForbidden, err)
	}
	_, err = a.Cancel(version, s.clock.Now())
	if err != nil {
		return AttemptView{}, err
	}
	if err := s.repo.Cancel(ctx, a); err != nil {
		return AttemptView{}, err
	}
	return attemptToView(a, s.clock.Now()), nil
}

type AttemptView struct {
	AttemptID    string            `json:"attempt_id"`
	AssignmentID string            `json:"assignment_id"`
	Status       string            `json:"status"`
	Version      int               `json:"version"`
	TimeLeftSec  int64             `json:"time_left_sec"`
	Total        int               `json:"total"`
	Cursor       int               `json:"cursor"`
	GuestName    string            `json:"guest_name,omitempty"`
	Policy       AttemptPolicyView `json:"policy"`
}

type AttemptPolicyView struct {
	ShuffleQuestions     bool   `json:"shuffle_questions"`
	ShuffleAnswers       bool   `json:"shuffle_answers"`
	RequireAllAnswered   bool   `json:"require_all_answered"`
	LockAnswerOnConfirm  bool   `json:"lock_answer_on_confirm"`
	DisableCopy          bool   `json:"disable_copy"`
	DisableBrowserBack   bool   `json:"disable_browser_back"`
	ShowElapsedTime      bool   `json:"show_elapsed_time"`
	AllowNavigation      bool   `json:"allow_navigation"`
	QuestionTimeLimitSec int64  `json:"question_time_limit_sec"`
	MaxAttemptTimeSec    int64  `json:"max_attempt_time_sec"`
	RevealScoreMode      string `json:"reveal_score_mode"`
	RevealSolutions      bool   `json:"reveal_solutions"`
}

type QuestionView struct {
	ID           string       `json:"id"`
	QuestionText string       `json:"question_text"`
	ImageURL     string       `json:"image_url,omitempty"`
	Options      []OptionView `json:"options"`
}

type OptionView struct {
	ID         string `json:"id"`
	OptionText string `json:"option_text"`
	ImageURL   string `json:"image_url,omitempty"`
}

type AnsweredView struct {
	QuestionID string `json:"question_id"`
}

func attemptToView(a *Attempt, now time.Time) AttemptView {
	dl, hasDL := a.Deadline()
	var left int64
	if hasDL && now.Before(dl) && a.Status() == StatusActive {
		left = int64(dl.Sub(now).Seconds())
	}
	av := AttemptView{
		AttemptID:    string(a.ID()),
		AssignmentID: string(a.Assignment()),
		Status:       string(a.Status()),
		Version:      a.Version(),
		TimeLeftSec:  left,
		Total:        a.Total(),
		Cursor:       a.Cursor(),
	}
	if a.GuestName() != nil {
		av.GuestName = *a.GuestName()
	}
	av.Policy = toPolicyView(a.Policy())
	return av
}

func toPolicyView(p AttemptPolicy) AttemptPolicyView {
	view := AttemptPolicyView{
		ShuffleQuestions:    p.ShuffleQuestions,
		ShuffleAnswers:      p.ShuffleAnswers,
		RequireAllAnswered:  p.RequireAllAnswered,
		LockAnswerOnConfirm: p.LockAnswerOnConfirm,
		DisableCopy:         p.DisableCopy,
		DisableBrowserBack:  p.DisableBrowserBack,
		ShowElapsedTime:     p.ShowElapsedTime,
		AllowNavigation:     p.AllowNavigation,
		RevealScoreMode:     string(p.RevealScoreMode),
		RevealSolutions:     p.RevealSolutions,
	}
	if p.QuestionTimeLimit > 0 {
		view.QuestionTimeLimitSec = int64(p.QuestionTimeLimit / time.Second)
	}
	if p.MaxAttemptTime > 0 {
		view.MaxAttemptTimeSec = int64(p.MaxAttemptTime / time.Second)
	}
	return view
}

func makeQuestionView(v VisibleQuestion, opts []VisibleOption) QuestionView {
	out := QuestionView{
		ID:           v.ID,
		QuestionText: v.QuestionText,
		ImageURL:     v.ImageURL,
		Options:      make([]OptionView, 0, len(opts)),
	}
	for _, o := range opts {
		out.Options = append(out.Options, OptionView{
			ID:         o.ID,
			OptionText: o.OptionText,
			ImageURL:   o.ImageURL,
		})
	}
	return out
}

func shuffleQuestionIDs(qs []VisibleQuestion, seed int64) []QuestionID {
	ids := make([]QuestionID, 0, len(qs))
	for _, q := range qs {
		ids = append(ids, QuestionID(q.ID))
	}
	r := rand.New(rand.NewSource(seed))
	r.Shuffle(len(ids), func(i, j int) { ids[i], ids[j] = ids[j], ids[i] })
	return ids
}

func shuffleOptions(opts []VisibleOption, seed int64, position int) []VisibleOption {
	cp := make([]VisibleOption, len(opts))
	copy(cp, opts)
	r := rand.New(rand.NewSource(seed ^ int64(position+1)))
	r.Shuffle(len(cp), func(i, j int) { cp[i], cp[j] = cp[j], cp[i] })
	return cp
}

func simpleScore(qs []QuestionForScoring, answers map[QuestionID]Answer) (float64, float64, error) {
	var score, max float64
	m := make(map[string]Answer, len(answers))
	for id, a := range answers {
		m[string(id)] = a
	}
	for _, q := range qs {
		max += q.Weight
		ans, ok := m[q.ID]
		if !ok {
			continue
		}
		okEq, err := isCorrectJSON(q.Type, q.CorrectJSON, ans.Payload)
		if err != nil {
			return 0, 0, err
		}
		if okEq {
			score += q.Weight
		}
	}
	return score, max, nil
}

func isCorrectJSON(qType string, expected []byte, payload AnswerPayload) (bool, error) {
	var exp any
	if err := json.Unmarshal(expected, &exp); err != nil {
		return false, err
	}

	var got any
	switch payload.Kind {
	case AnswerSingle:
		got = []int{payload.Single}
	case AnswerMulti:
		got = payload.Multi
	case AnswerText:
		got = payload.Text
	case AnswerCode:
		got = map[string]string{"lang": payload.Code.Lang, "body": payload.Code.Body}
	default:
		got = nil
	}
	b, _ := json.Marshal(got)
	var norm any
	if err := json.Unmarshal(b, &norm); err != nil {
		return false, err
	}
	return deepEqualJSON(exp, norm), nil
}

func deepEqualJSON(a, b any) bool {
	switch av := a.(type) {
	case map[string]any:
		bv, ok := b.(map[string]any)
		if !ok || len(av) != len(bv) {
			return false
		}
		for k, v := range av {
			if !deepEqualJSON(v, bv[k]) {
				return false
			}
		}
		return true
	case []any:
		bv, ok := b.([]any)
		if !ok || len(av) != len(bv) {
			return false
		}
		for i := range av {
			if !deepEqualJSON(av[i], bv[i]) {
				return false
			}
		}
		return true
	default:
		return a == b
	}
}
