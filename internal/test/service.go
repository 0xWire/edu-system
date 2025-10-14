package test

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"edu-system/internal/test/dto"
	ta "edu-system/internal/testAttempt"
)

var ErrForbidden = errors.New("forbidden")

type TestService interface {
	CreateTest(ownerID uint, req *dto.CreateTestRequest) error
	GetTest(ownerID uint, testID string) (*dto.GetTestResponse, error)
	ListTests(ownerID uint) ([]*dto.GetTestResponse, error)
	UpdateTest(ownerID uint, testID string, req *dto.UpdateTestRequest) error
	DeleteTest(ownerID uint, testID string) error
}

type testService struct {
	testRepo TestRepository
}

func NewTestService(testRepo TestRepository) TestService {
	return &testService{
		testRepo: testRepo,
	}
}

func (t testService) CreateTest(ownerID uint, req *dto.CreateTestRequest) error {
	test := &Test{
		AuthorID:    ownerID,
		Author:      req.Author,
		Title:       req.Title,
		Description: req.Description,
		Questions:   make([]Question, 0),
	}

	for _, q := range req.Questions {
		question := Question{
			QuestionText:  q.QuestionText,
			Options:       make([]Option, 0),
			CorrectOption: q.CorrectOption,
		}

		for _, option := range q.Options {
			question.Options = append(question.Options, Option{
				OptionText: option.AnswerText,
				ImageURL:   option.ImageURL,
			})
		}

		test.Questions = append(test.Questions, question)
	}

	return t.testRepo.Create(test)
}

func (t testService) GetTest(ownerID uint, testID string) (*dto.GetTestResponse, error) {
	test, err := t.testRepo.GetByID(testID)
	if err != nil {
		return nil, err
	}
	if test.AuthorID != ownerID {
		return nil, ErrForbidden
	}

	policy, err := decodeAttemptPolicy(test.AttemptPolicy, test.DurationSec)
	if err != nil {
		return nil, err
	}

	response := &dto.GetTestResponse{
		TestID:         test.ID, // Use ID field from model
		Author:         test.Author,
		Title:          test.Title,
		Description:    test.Description,
		DurationSec:    test.DurationSec,
		AllowGuests:    test.AllowGuests,
		AvailableFrom:  cloneTimePtr(test.AvailableFrom),
		AvailableUntil: cloneTimePtr(test.AvailableUntil),
		AttemptPolicy:  attemptPolicyToDTO(policy),
		Questions:      make([]dto.QuestionResponse, 0),
	}

	for _, q := range test.Questions {
		questionResponse := dto.QuestionResponse{
			ID:            q.ID,
			QuestionText:  q.QuestionText,
			CorrectOption: q.CorrectOption,
			ImageURL:      q.ImageURL,
			Options:       make([]dto.OptionResponse, 0),
		}

		for _, opt := range q.Options {
			questionResponse.Options = append(questionResponse.Options, dto.OptionResponse{
				ID:         opt.ID,
				OptionText: opt.OptionText,
				ImageURL:   opt.ImageURL,
			})
		}

		response.Questions = append(response.Questions, questionResponse)
	}

	return response, nil
}

func (t testService) UpdateTest(ownerID uint, testID string, req *dto.UpdateTestRequest) error {
	test, err := t.testRepo.GetByID(testID)
	if err != nil {
		return err
	}
	if test.AuthorID != ownerID {
		return ErrForbidden
	}

	if req.Title != "" {
		test.Title = req.Title
	}
	if req.Description != "" {
		test.Description = req.Description
	}

	if req.Questions != nil {
		test.Questions = make([]Question, 0, len(req.Questions))

		for _, q := range req.Questions {
			question := Question{
				QuestionText:  q.QuestionText,
				Options:       make([]Option, 0, len(q.Options)),
				CorrectOption: q.CorrectOption,
			}

			for _, option := range q.Options {
				question.Options = append(question.Options, Option{
					OptionText: option.AnswerText,
					ImageURL:   option.ImageURL,
				})
			}

			test.Questions = append(test.Questions, question)
		}
	}

	if req.Settings != nil {
		if req.Settings.DurationSec != nil {
			if *req.Settings.DurationSec < 0 {
				return fmt.Errorf("duration_sec must be >= 0")
			}
			test.DurationSec = *req.Settings.DurationSec
		}
		if req.Settings.AllowGuests != nil {
			test.AllowGuests = *req.Settings.AllowGuests
		}
		if req.Settings.AvailableFrom != nil {
			from := req.Settings.AvailableFrom.UTC()
			test.AvailableFrom = &from
		}
		if req.Settings.AvailableUntil != nil {
			until := req.Settings.AvailableUntil.UTC()
			test.AvailableUntil = &until
		}
		if req.Settings.AttemptPolicy != nil {
			policy, err := decodeAttemptPolicy(test.AttemptPolicy, test.DurationSec)
			if err != nil {
				return err
			}
			if err := applyPolicyUpdates(&policy, req.Settings.AttemptPolicy); err != nil {
				return err
			}
			encoded, err := encodeAttemptPolicy(policy)
			if err != nil {
				return err
			}
			test.AttemptPolicy = encoded
		}
	}

	return t.testRepo.Update(test)
}

func (t testService) DeleteTest(ownerID uint, testID string) error {
	test, err := t.testRepo.GetByID(testID)
	if err != nil {
		return err
	}
	if test.AuthorID != ownerID {
		return ErrForbidden
	}
	return t.testRepo.Delete(testID)
}

func (t testService) ListTests(ownerID uint) ([]*dto.GetTestResponse, error) {
	tests, err := t.testRepo.GetByOwner(ownerID)
	if err != nil {
		return nil, err
	}

	responses := make([]*dto.GetTestResponse, len(tests))
	for i, test := range tests {
		policy, err := decodeAttemptPolicy(test.AttemptPolicy, test.DurationSec)
		if err != nil {
			return nil, err
		}
		responses[i] = &dto.GetTestResponse{
			TestID:         test.ID, // Use ID field from model
			Author:         test.Author,
			Title:          test.Title,
			Description:    test.Description,
			DurationSec:    test.DurationSec,
			AllowGuests:    test.AllowGuests,
			AvailableFrom:  cloneTimePtr(test.AvailableFrom),
			AvailableUntil: cloneTimePtr(test.AvailableUntil),
			AttemptPolicy:  attemptPolicyToDTO(policy),
			Questions:      make([]dto.QuestionResponse, 0),
		}

		for _, q := range test.Questions {
			questionResponse := dto.QuestionResponse{
				ID:            q.ID,
				QuestionText:  q.QuestionText,
				CorrectOption: q.CorrectOption,
				ImageURL:      q.ImageURL,
				Options:       make([]dto.OptionResponse, 0),
			}

			for _, opt := range q.Options {
				questionResponse.Options = append(questionResponse.Options, dto.OptionResponse{
					ID:         opt.ID,
					OptionText: opt.OptionText,
					ImageURL:   opt.ImageURL,
				})
			}

			responses[i].Questions = append(responses[i].Questions, questionResponse)
		}
	}

	return responses, nil
}

func cloneTimePtr(src *time.Time) *time.Time {
	if src == nil {
		return nil
	}
	val := src.UTC()
	return &val
}

func decodeAttemptPolicy(raw []byte, durationSec int) (ta.AttemptPolicy, error) {
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

func attemptPolicyToDTO(policy ta.AttemptPolicy) dto.AttemptPolicyView {
	questionLimit := int64(0)
	if policy.QuestionTimeLimit > 0 {
		questionLimit = int64(policy.QuestionTimeLimit / time.Second)
	}
	attemptLimit := int64(0)
	if policy.MaxAttemptTime > 0 {
		attemptLimit = int64(policy.MaxAttemptTime / time.Second)
	}

	return dto.AttemptPolicyView{
		ShuffleQuestions:     policy.ShuffleQuestions,
		ShuffleAnswers:       policy.ShuffleAnswers,
		MaxQuestions:         policy.MaxQuestions,
		QuestionTimeLimitSec: questionLimit,
		MaxAttemptTimeSec:    attemptLimit,
		RequireAllAnswered:   policy.RequireAllAnswered,
		LockAnswerOnConfirm:  policy.LockAnswerOnConfirm,
		DisableCopy:          policy.DisableCopy,
		DisableBrowserBack:   policy.DisableBrowserBack,
		ShowElapsedTime:      policy.ShowElapsedTime,
		AllowNavigation:      policy.AllowNavigation,
		RevealScoreMode:      string(policy.RevealScoreMode),
		RevealSolutions:      policy.RevealSolutions,
		MaxAttempts:          policy.MaxAttempts,
	}
}

func applyPolicyUpdates(policy *ta.AttemptPolicy, payload *dto.AttemptPolicyPayload) error {
	if payload.ShuffleQuestions != nil {
		policy.ShuffleQuestions = *payload.ShuffleQuestions
	}
	if payload.ShuffleAnswers != nil {
		policy.ShuffleAnswers = *payload.ShuffleAnswers
	}
	if payload.MaxQuestions != nil {
		if *payload.MaxQuestions < 0 {
			policy.MaxQuestions = 0
		} else {
			policy.MaxQuestions = *payload.MaxQuestions
		}
	}
	if payload.QuestionTimeLimitSec != nil {
		val := *payload.QuestionTimeLimitSec
		if val <= 0 {
			policy.QuestionTimeLimit = 0
		} else {
			policy.QuestionTimeLimit = time.Duration(val) * time.Second
		}
	}
	if payload.MaxAttemptTimeSec != nil {
		val := *payload.MaxAttemptTimeSec
		if val <= 0 {
			policy.MaxAttemptTime = 0
		} else {
			policy.MaxAttemptTime = time.Duration(val) * time.Second
		}
	}
	if payload.RequireAllAnswered != nil {
		policy.RequireAllAnswered = *payload.RequireAllAnswered
	}
	if payload.LockAnswerOnConfirm != nil {
		policy.LockAnswerOnConfirm = *payload.LockAnswerOnConfirm
	}
	if payload.DisableCopy != nil {
		policy.DisableCopy = *payload.DisableCopy
	}
	if payload.DisableBrowserBack != nil {
		policy.DisableBrowserBack = *payload.DisableBrowserBack
	}
	if payload.ShowElapsedTime != nil {
		policy.ShowElapsedTime = *payload.ShowElapsedTime
	}
	if payload.AllowNavigation != nil {
		policy.AllowNavigation = *payload.AllowNavigation
	}
	if payload.RevealScoreMode != nil {
		mode := ta.ScoreRevealMode(*payload.RevealScoreMode)
		switch mode {
		case ta.ScoreRevealNever, ta.ScoreRevealAfterSubmit, ta.ScoreRevealAlways:
			policy.RevealScoreMode = mode
		default:
			return fmt.Errorf("invalid reveal_score_mode: %s", *payload.RevealScoreMode)
		}
	}
	if payload.RevealSolutions != nil {
		policy.RevealSolutions = *payload.RevealSolutions
	}
	if payload.MaxAttempts != nil {
		if *payload.MaxAttempts < 0 {
			policy.MaxAttempts = 0
		} else {
			policy.MaxAttempts = *payload.MaxAttempts
		}
	}
	return nil
}

func encodeAttemptPolicy(policy ta.AttemptPolicy) ([]byte, error) {
	return json.Marshal(policy)
}
