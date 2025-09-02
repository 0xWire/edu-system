package testAttempt

import (
	"context"
	"errors"
	"time"
)

var (
	ErrNotFound            = errors.New("testattempt: not found")
	ErrAlreadyCompleted    = errors.New("testattempt: attempt already completed")
	ErrActiveAttemptExists = errors.New("testattempt: active attempt already exists")
)

type AttemptRepository interface {
	CreateAttempt(ctx context.Context, a *TestAttempt) error
	GetAttempt(ctx context.Context, id string, withAnswers bool) (*TestAttempt, error)
	ListByUser(ctx context.Context, username string, limit, offset int) ([]TestAttempt, int, error)
	UpsertAnswer(ctx context.Context, attemptID string, ans SelectedAnswer) error
	FinishAttempt(ctx context.Context, attemptID string, score, total int) error
	HasActiveAttempt(ctx context.Context, testID, username string) (bool, error)
	CountUserAttempts(ctx context.Context, testID, username string) (int, error)
	LastAttemptTime(ctx context.Context, testID, username string) (*time.Time, error)
}
