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

type TestReadModel interface {
	GetTestSettings(ctx context.Context, testID string) (durationSec int, availableFrom, availableUntil *time.Time, allowGuests bool, err error)
	ListVisibleQuestions(ctx context.Context, testID string) ([]VisibleQuestion, error)
	ListQuestionsForScoring(ctx context.Context, testID string) ([]QuestionForScoring, error)
}

type AssignmentReadModel interface {
	GetAssignment(ctx context.Context, id AssignmentID) (AssignmentDescriptor, error)
}

type AssignmentDescriptor struct {
	ID      AssignmentID
	TestID  TestID
	OwnerID UserID
	Title   string
}

type Service struct {
	repo        Repository
	tests       TestReadModel
	assignments AssignmentReadModel
	tx          Transactor
	clock       Clock
	policy      Policy
}

func NewTestAttemptService(repo Repository, tests TestReadModel, assignments AssignmentReadModel, tx Transactor, clock Clock, policy Policy) *Service {
	return &Service{repo: repo, tests: tests, assignments: assignments, tx: tx, clock: clock, policy: policy}
}

func (s *Service) StartAttempt(ctx context.Context, userID *UserID, guestName *string, assignmentID AssignmentID) (AttemptID, error) {
	assignment, err := s.assignments.GetAssignment(ctx, assignmentID)
	if err != nil {
		return "", err
	}
	testID := assignment.TestID

	dur, from, until, allowGuests, err := s.tests.GetTestSettings(ctx, string(testID))
	if err != nil {
		return "", err
	}
	if userID == nil && !allowGuests {
		return "", ErrGuestsNotAllowed
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

	seed := now.UnixNano() ^ int64(rand.Int())
	var uid UserID
	if userID != nil {
		uid = *userID
	}
	a := NewAttempt(NewAttemptID(), assignmentID, testID, uid, guestName, now, time.Duration(dur)*time.Second, seed)

	vis, err := s.tests.ListVisibleQuestions(ctx, string(testID))
	if err != nil {
		return "", err
	}
	order := shuffleQuestionIDs(vis, seed)
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

	qid, err := a.NextQuestionID(s.clock.Now())
	if err != nil {
		return attemptToView(a, s.clock.Now()), QuestionView{}, err
	}

	vis, err := s.tests.ListVisibleQuestions(ctx, string(a.Test()))
	if err != nil {
		return AttemptView{}, QuestionView{}, err
	}
	m := make(map[string]VisibleQuestion, len(vis))
	for _, q := range vis {
		m[q.ID] = q
	}
	vq, ok := m[string(qid)]
	if !ok {
		return AttemptView{}, QuestionView{}, errors.New("question not found in test")
	}
	options := shuffleOptions(vq.Options, a.Seed(), a.Cursor())

	return attemptToView(a, s.clock.Now()), makeQuestionView(vq, options), nil
}

func (s *Service) AnswerCurrent(ctx context.Context, requester *UserID, id AttemptID, version int, payload AnswerPayload) (AttemptView, AnsweredView, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return AttemptView{}, AnsweredView{}, err
	}
	if err := s.policy.CanModifyAttempt(ctx, requester, a); err != nil {
		return AttemptView{}, AnsweredView{}, fmt.Errorf("%w: %v", ErrForbidden, err)
	}
	newVersion, qid, err := a.AnswerCurrent(version, s.clock.Now(), payload)
	if err != nil {
		return AttemptView{}, AnsweredView{}, err
	}
	err = s.tx.WithinTx(ctx, func(ctx context.Context) error {
		return s.repo.SaveAnswer(ctx, a, qid)
	})
	if err != nil {
		return AttemptView{}, AnsweredView{}, err
	}
	av := attemptToView(a, s.clock.Now())
	av.Version = newVersion
	return av, AnsweredView{QuestionID: string(qid)}, nil
}

func (s *Service) Submit(ctx context.Context, requester *UserID, id AttemptID, version int) (AttemptView, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return AttemptView{}, err
	}
	if err := s.policy.CanModifyAttempt(ctx, requester, a); err != nil {
		return AttemptView{}, fmt.Errorf("%w: %v", ErrForbidden, err)
	}
	qs, err := s.tests.ListQuestionsForScoring(ctx, string(a.Test()))
	if err != nil {
		return AttemptView{}, err
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
	AttemptID    string `json:"attempt_id"`
	AssignmentID string `json:"assignment_id"`
	Status       string `json:"status"`
	Version      int    `json:"version"`
	TimeLeftSec  int64  `json:"time_left_sec"`
	Total        int    `json:"total"`
	Cursor       int    `json:"cursor"`
	GuestName    string `json:"guest_name,omitempty"`
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
	return av
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
