package service

import (
	"edu-system/internal/dto"
	"edu-system/internal/models"
	"edu-system/internal/repository"
)

type TestService interface {
	CreateTest(req *dto.CreateTestRequest) error
	GetTest(testID string) (*dto.GetTestResponse, error)
	GetAllTests() ([]*dto.GetTestResponse, error)
	UpdateTest(testID string, req *dto.UpdateTestRequest) error
	DeleteTest(testID string) error
}

type testService struct {
	testRepo repository.TestRepository
}

func NewTestService(testRepo repository.TestRepository) TestService {
	return &testService{
		testRepo: testRepo,
	}
}

func (t testService) CreateTest(req *dto.CreateTestRequest) error {
	test := &models.Test{
		Author:      req.Author,
		Title:       req.Title,
		Description: req.Description,
		Questions:   make([]models.Question, 0),
	}

	for _, q := range req.Questions {
		question := models.Question{
			QuestionText:  q.QuestionText,
			Options:       make([]models.Option, 0),
			CorrectOption: q.CorrectOption,
		}

		for _, option := range q.Options {
			question.Options = append(question.Options, models.Option{
				OptionText: option.AnswerText,
				ImageURL:   option.ImageURL,
			})
		}

		test.Questions = append(test.Questions, question)
	}

	return t.testRepo.Create(test)
}

func (t testService) GetTest(testID string) (*dto.GetTestResponse, error) {
	test, err := t.testRepo.GetByID(testID)
	if err != nil {
		return nil, err
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

func (t testService) UpdateTest(testID string, req *dto.UpdateTestRequest) error {
	test, err := t.testRepo.GetByID(testID)
	if err != nil {
		return err
	}

	test.Title = req.Title
	test.Description = req.Description

	test.Questions = make([]models.Question, 0)

	for _, q := range req.Questions {
		question := models.Question{
			QuestionText:  q.QuestionText,
			Options:       make([]models.Option, 0),
			CorrectOption: q.CorrectOption,
		}

		for _, option := range q.Options {
			question.Options = append(question.Options, models.Option{
				OptionText: option.AnswerText,
				ImageURL:   option.ImageURL,
			})
		}

		test.Questions = append(test.Questions, question)
	}

	return t.testRepo.Update(test)
}

func (t testService) DeleteTest(testID string) error {
	return t.testRepo.Delete(testID)
}

func (t testService) GetAllTests() ([]*dto.GetTestResponse, error) {
	tests, err := t.testRepo.GetAll()
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
