package service

import (
	"edu-system/internal/dto"
	"edu-system/internal/models"
	"edu-system/internal/repository"
)

type TestService interface {
	CreateTest(req *dto.CreateTestRequest) error
	GetTest(testID string) (*dto.GetTestResponse, error)
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
		test.Questions = append(test.Questions, models.Question{
			QuestionText:  q.QuestionText,
			Options:       make([]models.Option, 0),
			CorrectOption: q.CorrectOption,
		})
	}

	for _, option := range req.Questions[0].Options {
		test.Questions[0].Options = append(test.Questions[0].Options, models.Option{
			OptionText: option.AnswerText,
			ImageURL:   option.ImageURL,
		})
	}
	return t.testRepo.Create(test)
}

func (t testService) GetTest(testID string) (*dto.GetTestResponse, error) {
	//TODO implement me
	panic("implement me")
}

func (t testService) UpdateTest(testID string, req *dto.UpdateTestRequest) error {
	//TODO implement me
	panic("implement me")
}

func (t testService) DeleteTest(testID string) error {
	//TODO implement me
	panic("implement me")
}
