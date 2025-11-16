package testrepo

import (
	"bytes"
	"context"
	"encoding/json"
	"time"

	"gorm.io/gorm"

	"edu-system/internal/test"
	ta "edu-system/internal/testAttempt"
)

var _ ta.TestReadModel = (*testRepository)(nil)

type testRepository struct {
	db *gorm.DB
}

func NewTestRepository(db *gorm.DB) test.TestRepository {
	return &testRepository{db: db}
}

func (r *testRepository) Create(t *test.Test) error {
	return r.db.Create(t).Error
}

func (r *testRepository) GetByID(id string) (*test.Test, error) {
	var t test.Test
	err := r.db.Preload("Questions.Options").First(&t, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *testRepository) GetByOwner(ownerID uint) ([]*test.Test, error) {
	var tests []*test.Test
	err := r.db.Preload("Questions.Options").Where("author_id = ?", ownerID).Find(&tests).Error
	if err != nil {
		return nil, err
	}
	return tests, nil
}

func (r *testRepository) Update(t *test.Test) error {
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).Save(t).Error
}

func (r *testRepository) Delete(id string) error {
	return r.db.Delete(&test.Test{}, "id = ?", id).Error
}

func (r *testRepository) GetTestSettings(ctx context.Context, testID string) (durationSec int, availableFrom, availableUntil *time.Time, allowGuests bool, policy ta.AttemptPolicy, err error) {
	var t test.Test
	if err = r.db.WithContext(ctx).First(&t, "id = ?", testID).Error; err != nil {
		return 0, nil, nil, false, ta.AttemptPolicy{}, err
	}
	if policy, err = decodePolicy(t.AttemptPolicy, t.DurationSec); err != nil {
		return 0, nil, nil, false, ta.AttemptPolicy{}, err
	}
	return t.DurationSec, t.AvailableFrom, t.AvailableUntil, t.AllowGuests, policy, nil
}

func (r *testRepository) ListVisibleQuestions(ctx context.Context, testID string) ([]ta.VisibleQuestion, error) {
	var qs []test.Question
	if err := r.db.WithContext(ctx).
		Preload("Options").
		Where("test_id = ?", testID).
		Find(&qs).Error; err != nil {
		return nil, err
	}

	out := make([]ta.VisibleQuestion, 0, len(qs))
	for _, q := range qs {
		opts := make([]ta.VisibleOption, 0, len(q.Options))
		for _, o := range q.Options {
			opts = append(opts, ta.VisibleOption{
				ID:         o.ID,
				OptionText: o.OptionText,
				ImageURL:   o.ImageURL,
			})
		}
		out = append(out, ta.VisibleQuestion{
			ID:           q.ID,
			Type:         normalizeQuestionType(q.Type),
			QuestionText: q.QuestionText,
			ImageURL:     q.ImageURL,
			Weight:       normalizeWeight(q.Weight),
			Options:      opts,
		})
	}
	return out, nil
}

func (r *testRepository) ListQuestionsForScoring(ctx context.Context, testID string) ([]ta.QuestionForScoring, error) {
	var qs []test.Question
	if err := r.db.WithContext(ctx).
		Where("test_id = ?", testID).
		Find(&qs).Error; err != nil {
		return nil, err
	}

	out := make([]ta.QuestionForScoring, 0, len(qs))
	for _, q := range qs {
		qType := normalizeQuestionType(q.Type)
		weight := normalizeWeight(q.Weight)
		var correct []byte
		if len(q.CorrectJSON) > 0 {
			correct = q.CorrectJSON
		} else {
			correct, _ = json.Marshal(map[string]any{"selected": []int{q.CorrectOption}})
		}
		if qType == "text" || qType == "code" {
			correct = nil
		}
		out = append(out, ta.QuestionForScoring{
			ID:          q.ID,
			Type:        qType,
			Weight:      weight,
			CorrectJSON: correct,
		})
	}
	return out, nil
}

func decodePolicy(raw []byte, durationSec int) (ta.AttemptPolicy, error) {
	raw = bytes.TrimSpace(raw)

	policy := defaultAttemptPolicy()
	if len(raw) != 0 && !bytes.Equal(raw, []byte("null")) && !bytes.Equal(raw, []byte("{}")) {
		if err := json.Unmarshal(raw, &policy); err != nil {
			return ta.AttemptPolicy{}, err
		}
	}
	if policy.MaxAttemptTime <= 0 && durationSec > 0 {
		policy.MaxAttemptTime = time.Duration(durationSec) * time.Second
	}
	return policy, nil
}

func defaultAttemptPolicy() ta.AttemptPolicy {
	return ta.AttemptPolicy{
		ShuffleQuestions: true,
		ShuffleAnswers:   true,
	}
}

func normalizeQuestionType(t string) string {
	switch t {
	case "multi", "text", "code":
		return t
	default:
		return "single"
	}
}

func normalizeWeight(w float64) float64 {
	if w <= 0 {
		return 1
	}
	return w
}
