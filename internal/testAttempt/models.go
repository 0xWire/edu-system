package testAttempt

import (
	"errors"
	"fmt"
	"math"
	"time"
)

var (
	ErrClosed           = errors.New("attempt closed")
	ErrVersionMismatch  = errors.New("version mismatch")
	ErrInvalidState     = errors.New("invalid state")
	ErrValidation       = errors.New("validation error")
	ErrNoMoreQuestions  = errors.New("no more questions")
	ErrForbidden        = errors.New("forbidden")
	ErrGuestsNotAllowed = errors.New("guests not allowed")
)

type AttemptStatus string

const (
	StatusActive    AttemptStatus = "active"
	StatusSubmitted AttemptStatus = "submitted"
	StatusExpired   AttemptStatus = "expired"
	StatusCanceled  AttemptStatus = "canceled"
)

type (
	AttemptID  string
	TestID     string
	UserID     uint64
	QuestionID string
)

type AnswerKind int

const (
	AnswerSingle AnswerKind = iota
	AnswerMulti
	AnswerText
	AnswerCode
)

type CodePayload struct {
	Lang string
	Body string
}

type AnswerPayload struct {
	Kind   AnswerKind
	Single int
	Multi  []int
	Text   string
	Code   *CodePayload
}

func (p *AnswerPayload) Validate() error {
	if p == nil {
		return fmt.Errorf("%w: payload is nil", ErrValidation)
	}
	switch p.Kind {
	case AnswerSingle:
		if len(p.Multi) > 0 || p.Text != "" || p.Code != nil {
			return fmt.Errorf("%w: kind=single requires Single only", ErrValidation)
		}
	case AnswerMulti:
		if p.Text != "" || p.Code != nil {
			return fmt.Errorf("%w: kind=multi requires Multi only", ErrValidation)
		}
	case AnswerText:
		if len(p.Multi) > 0 || p.Code != nil {
			return fmt.Errorf("%w: kind=text requires Text only", ErrValidation)
		}
	case AnswerCode:
		if len(p.Multi) > 0 || p.Text != "" {
			return fmt.Errorf("%w: kind=code requires Code only", ErrValidation)
		}
		if p.Code == nil || p.Code.Lang == "" {
			return fmt.Errorf("%w: code lang is required", ErrValidation)
		}
	default:
		return fmt.Errorf("%w: unknown kind", ErrValidation)
	}
	return nil
}

type Answer struct {
	QuestionID QuestionID
	Payload    AnswerPayload
	IsCorrect  *bool
	Score      *float64
}

func (a Answer) deepCopy() Answer {
	cp := a
	if a.Payload.Multi != nil {
		cp.Payload.Multi = append([]int(nil), a.Payload.Multi...)
	}
	if a.Payload.Code != nil {
		c := *a.Payload.Code
		cp.Payload.Code = &c
	}
	return cp
}

type Attempt struct {
	id          AttemptID
	test        TestID
	user        UserID
	guestName   *string
	startedAt   time.Time
	submittedAt *time.Time
	expiredAt   *time.Time
	status      AttemptStatus
	duration    time.Duration
	version     int
	seed        int64
	score       float64
	maxScore    float64

	order        []QuestionID
	cursor       int // index for next question
	answers      map[QuestionID]Answer
	totalVisible int // total questions in the plan
}

func NewAttempt(id AttemptID, test TestID, user UserID, guestName *string, now time.Time, dur time.Duration, seed int64) *Attempt {
	return &Attempt{
		id:           id,
		test:         test,
		user:         user,
		guestName:    guestName,
		startedAt:    now.UTC(),
		status:       StatusActive,
		duration:     dur,
		version:      0,
		seed:         seed,
		answers:      make(map[QuestionID]Answer),
		totalVisible: 0,
	}
}

func (a *Attempt) InitializePlan(order []QuestionID) {
	cp := make([]QuestionID, len(order))
	copy(cp, order)
	a.order = cp
	a.totalVisible = len(cp)
	a.cursor = 0
}

func (a *Attempt) ID() AttemptID           { return a.id }
func (a *Attempt) Test() TestID            { return a.test }
func (a *Attempt) User() UserID            { return a.user }
func (a *Attempt) GuestName() *string      { return a.guestName }
func (a *Attempt) Status() AttemptStatus   { return a.status }
func (a *Attempt) Version() int            { return a.version }
func (a *Attempt) StartedAt() time.Time    { return a.startedAt }
func (a *Attempt) SubmittedAt() *time.Time { return a.submittedAt }
func (a *Attempt) ExpiredAt() *time.Time   { return a.expiredAt }
func (a *Attempt) Duration() time.Duration { return a.duration }
func (a *Attempt) Deadline() (time.Time, bool) {
	dl := a.deadline()
	return dl, !dl.IsZero()
}
func (a *Attempt) Seed() int64               { return a.seed }
func (a *Attempt) Score() (float64, float64) { return a.score, a.maxScore }
func (a *Attempt) Total() int                { return a.totalVisible }
func (a *Attempt) Cursor() int               { return a.cursor }
func (a *Attempt) Answers() map[QuestionID]Answer {
	out := make(map[QuestionID]Answer, len(a.answers))
	for k, v := range a.answers {
		out[k] = v.deepCopy()
	}
	return out
}

func (a *Attempt) Plan() []QuestionID {
	out := make([]QuestionID, len(a.order))
	copy(out, a.order)
	return out
}

func (a *Attempt) NextQuestionID(now time.Time) (QuestionID, error) {
	if a.exceeded(now.UTC()) {
		if a.status != StatusExpired {
			dl := a.deadline()
			a.status = StatusExpired
			a.expiredAt = &dl
		}
		return "", fmt.Errorf("%w: attempt is %s", ErrClosed, a.status)
	}
	if a.status != StatusActive {
		return "", fmt.Errorf("%w: status=%s", ErrClosed, a.status)
	}
	if a.cursor >= len(a.order) {
		return "", ErrNoMoreQuestions
	}
	return a.order[a.cursor], nil
}

func (a *Attempt) AnswerCurrent(clientVersion int, now time.Time, payload AnswerPayload) (int, QuestionID, error) {
	now = now.UTC()
	if a.exceeded(now) {
		if a.status != StatusExpired {
			dl := a.deadline()
			a.status = StatusExpired
			a.expiredAt = &dl
		}
		return a.version, "", fmt.Errorf("%w: attempt is %s", ErrClosed, a.status)
	}
	if a.status != StatusActive {
		return a.version, "", fmt.Errorf("%w: status=%s", ErrClosed, a.status)
	}
	if clientVersion != a.version {
		return a.version, "", fmt.Errorf("%w: have=%d want=%d", ErrVersionMismatch, a.version, clientVersion)
	}
	if err := payload.Validate(); err != nil {
		return a.version, "", err
	}
	if a.cursor >= len(a.order) {
		return a.version, "", ErrNoMoreQuestions
	}
	qid := a.order[a.cursor]
	a.answers[qid] = Answer{QuestionID: qid, Payload: payload}
	a.cursor++
	a.version++
	return a.version, qid, nil
}

func (a *Attempt) Submit(clientVersion int, now time.Time, score, max float64) (int, error) {
	now = now.UTC()
	if a.exceeded(now) && a.status == StatusActive {
		dl := a.deadline()
		a.status = StatusExpired
		a.expiredAt = &dl
	}
	if a.status != StatusActive {
		return a.version, fmt.Errorf("%w: submit from status=%s is not allowed", ErrInvalidState, a.status)
	}
	if clientVersion != a.version {
		return a.version, fmt.Errorf("%w: have=%d want=%d", ErrVersionMismatch, a.version, clientVersion)
	}
	if err := validateScores(score, max); err != nil {
		return a.version, err
	}
	a.score, a.maxScore = score, max
	a.status = StatusSubmitted
	t := now
	a.submittedAt = &t
	a.version++
	return a.version, nil
}

func (a *Attempt) Cancel(clientVersion int, now time.Time) (int, error) {
	now = now.UTC()
	if a.exceeded(now) && a.status == StatusActive {
		dl := a.deadline()
		a.status = StatusExpired
		a.expiredAt = &dl
	}
	if a.status != StatusActive {
		return a.version, fmt.Errorf("%w: cancel from status=%s is not allowed", ErrInvalidState, a.status)
	}
	if clientVersion != a.version {
		return a.version, fmt.Errorf("%w: have=%d want=%d", ErrVersionMismatch, a.version, clientVersion)
	}
	a.status = StatusCanceled
	a.version++
	return a.version, nil
}

func (a *Attempt) deadline() time.Time {
	if a.duration <= 0 {
		return time.Time{}
	}
	return a.startedAt.Add(a.duration)
}

func (a *Attempt) exceeded(now time.Time) bool {
	if a.duration <= 0 {
		return false
	}
	dl := a.deadline()
	if dl.IsZero() {
		return false
	}
	return !dl.After(now)
}

func validateScores(score, max float64) error {
	if math.IsNaN(score) || math.IsNaN(max) || math.IsInf(score, 0) || math.IsInf(max, 0) {
		return fmt.Errorf("%w: score/max must be finite numbers", ErrValidation)
	}
	if max <= 0 {
		return fmt.Errorf("%w: max must be > 0", ErrValidation)
	}
	if score < 0 || score > max {
		return fmt.Errorf("%w: score must be within [0, max]", ErrValidation)
	}
	return nil
}

func validatePersistedScores(status AttemptStatus, score, max float64) error {
	if math.IsNaN(score) || math.IsNaN(max) || math.IsInf(score, 0) || math.IsInf(max, 0) {
		return fmt.Errorf("%w: score/max must be finite numbers", ErrValidation)
	}
	if max < 0 {
		return fmt.Errorf("%w: max must be >= 0", ErrValidation)
	}
	if score < 0 || score > max {
		return fmt.Errorf("%w: score must be within [0, max]", ErrValidation)
	}
	if status != StatusActive && max == 0 {
		return fmt.Errorf("%w: max must be > 0", ErrValidation)
	}
	return nil
}
