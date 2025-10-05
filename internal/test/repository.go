package test

import (
	"context"
	"time"
	//TODO: remove circular dependency !!
	"edu-system/internal/testAttempt"
)

type TestRepository interface {
	Create(test *Test) error
	GetByID(id string) (*Test, error)
	GetByOwner(ownerID uint) ([]*Test, error)
	Update(test *Test) error
	Delete(id string) error

	//TODO: consider moving these methods to a separate interface
	GetTestSettings(ctx context.Context, testID string) (durationSec int, availableFrom, availableUntil *time.Time, allowGuests bool, err error)
	ListVisibleQuestions(ctx context.Context, testID string) ([]testAttempt.VisibleQuestion, error)
	ListQuestionsForScoring(ctx context.Context, testID string) ([]testAttempt.QuestionForScoring, error)
}
