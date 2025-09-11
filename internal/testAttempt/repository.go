package testAttempt

import "context"

type Repository interface {
	Create(ctx context.Context, a *Attempt) (AttemptID, error)
	GetByID(ctx context.Context, id AttemptID) (*Attempt, error)
	GetActiveByUserAndTest(ctx context.Context, user UserID, test TestID) (*Attempt, error)

	SaveAnswer(ctx context.Context, a *Attempt, answered QuestionID) error
	SaveProgress(ctx context.Context, a *Attempt) error
	Submit(ctx context.Context, a *Attempt) error
	Cancel(ctx context.Context, a *Attempt) error
}
