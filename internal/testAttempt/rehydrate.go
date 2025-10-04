package testAttempt

import (
	"errors"
	"fmt"
	"time"
)

func RehydrateAttempt(
	id AttemptID,
	test TestID,
	user UserID,
	guestName *string,
	startedAt time.Time,
	duration time.Duration,
	seed int64,
	order []QuestionID,
	cursor int,
	answers map[QuestionID]Answer,
	status AttemptStatus,
	version int,
	submittedAt *time.Time,
	expiredAt *time.Time,
	score float64,
	maxScore float64,
) (*Attempt, error) {
	if version < 0 {
		return nil, fmt.Errorf("version must be non-negative: %d", version)
	}
	if cursor < 0 || cursor > len(order) {
		return nil, fmt.Errorf("cursor out of range: %d", cursor)
	}
	switch status {
	case StatusActive, StatusSubmitted, StatusExpired, StatusCanceled:
	default:
		return nil, fmt.Errorf("unknown status: %s", status)
	}
	if err := validatePersistedScores(status, score, maxScore); err != nil {
		return nil, err
	}

	a := &Attempt{
		id:           id,
		test:         test,
		user:         user,
		startedAt:    startedAt.UTC(),
		status:       status,
		duration:     duration,
		version:      version,
		seed:         seed,
		answers:      make(map[QuestionID]Answer, len(answers)),
		totalVisible: len(order),
		score:        score,
		maxScore:     maxScore,
	}

	if guestName != nil {
		name := *guestName
		a.guestName = &name
	}

	a.order = make([]QuestionID, len(order))
	copy(a.order, order)
	a.cursor = cursor

	for qid, ans := range answers {
		cp := ans.deepCopy()
		cp.QuestionID = qid
		a.answers[qid] = cp
	}

	if submittedAt != nil {
		t := submittedAt.UTC()
		a.submittedAt = &t
	}
	if expiredAt != nil {
		t := expiredAt.UTC()
		a.expiredAt = &t
	}

	if a.status != StatusActive {
		if a.cursor > a.totalVisible {
			return nil, errors.New("invalid cursor for completed attempt")
		}
	}

	return a, nil
}
