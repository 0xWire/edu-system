package testAttempt

import "github.com/google/uuid"

func NewAttemptID() AttemptID {
	return AttemptID(uuid.NewString())
}
