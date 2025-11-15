package testAttempt

import "context"

type Repository interface {
	Create(ctx context.Context, a *Attempt) (AttemptID, error)
	GetByID(ctx context.Context, id AttemptID) (*Attempt, error)
	GetActiveByUserAndAssignment(ctx context.Context, user UserID, assignment AssignmentID) (*Attempt, error)

	SaveAnswer(ctx context.Context, a *Attempt, answered QuestionID) error
	SaveProgress(ctx context.Context, a *Attempt) error
	Submit(ctx context.Context, a *Attempt) error
	Cancel(ctx context.Context, a *Attempt) error

	ListSummariesByAssignments(ctx context.Context, assignments []AssignmentID) ([]AttemptSummary, error)
	CountAttempts(ctx context.Context, filter AttemptCountFilter) (AttemptCounts, error)
}

type AttemptCountFilter struct {
	Assignment        AssignmentID
	User              *UserID
	GuestName         *string
	ClientIP          string
	ClientFingerprint string
}

type AttemptCounts struct {
	ByUser        int
	ByGuest       int
	ByIP          int
	ByFingerprint int
}
