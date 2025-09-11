package testrepo

import (
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

func (r *testRepository) GetAll() ([]*test.Test, error) {
	var tests []*test.Test
	err := r.db.Preload("Questions.Options").Find(&tests).Error
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

func (r *testRepository) GetTestSettings(ctx context.Context, testID string) (durationSec int, availableFrom, availableUntil *time.Time, allowGuests bool, err error) {
	var t test.Test
	if err = r.db.WithContext(ctx).First(&t, "id = ?", testID).Error; err != nil {
		return 0, nil, nil, false, err
	}
	return t.DurationSec, t.AvailableFrom, t.AvailableUntil, t.AllowGuests, nil
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
			QuestionText: q.QuestionText,
			ImageURL:     q.ImageURL,
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
		cj, _ := json.Marshal(map[string]any{"selected": []int{q.CorrectOption}})
		out = append(out, ta.QuestionForScoring{
			ID:          q.ID,
			Type:        "single",
			Weight:      1.0,
			CorrectJSON: cj,
		})
	}
	return out, nil
}
