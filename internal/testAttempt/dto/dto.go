package dto

type StartAttemptRequest struct {
	TestID    string  `json:"test_id" validate:"required,uuid4"`
	GuestName *string `json:"guest_name,omitempty" validate:"omitempty,min=1,max=64"`
}

type StartAttemptResponse struct {
	Attempt AttemptView `json:"attempt"`
}

type AttemptView struct {
	AttemptID   string `json:"attempt_id"`
	Status      string `json:"status"`
	Version     int    `json:"version"`
	TimeLeftSec int64  `json:"time_left_sec"`
	Total       int    `json:"total"`
	Cursor      int    `json:"cursor"`
	GuestName   string `json:"guest_name,omitempty"`
}

type NextQuestionResponse struct {
	Attempt  AttemptView  `json:"attempt"`
	Question QuestionView `json:"question"`
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

type AnswerRequest struct {
	Version int         `json:"version" validate:"gte=0"`
	Payload interface{} `json:"payload" validate:"required"`
}

type AnswerResponse struct {
	Attempt    AttemptView `json:"attempt"`
	QuestionID string      `json:"question_id"`
}

type SubmitRequest struct {
	Version int `json:"version" validate:"gte=0"`
}

type SubmitResponse struct {
	Attempt AttemptView `json:"attempt"`
}
