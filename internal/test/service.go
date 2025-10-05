package test

import (
	"errors"

	"edu-system/internal/test/dto"
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

	response := &dto.GetTestResponse{
		TestID:      test.ID, // Use ID field from model
		Author:      test.Author,
		Title:       test.Title,
		Description: test.Description,
		Questions:   make([]dto.QuestionResponse, 0),
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

	test.Title = req.Title
	test.Description = req.Description

	test.Questions = make([]Question, 0)

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
		responses[i] = &dto.GetTestResponse{
			TestID:      test.ID, // Use ID field from model
			Author:      test.Author,
			Title:       test.Title,
			Description: test.Description,
			Questions:   make([]dto.QuestionResponse, 0),
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
