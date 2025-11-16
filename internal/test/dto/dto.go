package dto

import "time"

type CreateTestRequest struct {
	Author      string     `json:"author"`
	Title       string     `json:"title" binding:"required"`
	Description string     `json:"description" binding:"required"`
	Questions   []Question `json:"questions" binding:"required,min=1"`
}

type GetTestResponse struct {
	Author         string             `json:"author"`
	TestID         string             `json:"test_id"`
	Title          string             `json:"title"`
	Description    string             `json:"description"`
	DurationSec    int                `json:"duration_sec"`
	AllowGuests    bool               `json:"allow_guests"`
	AvailableFrom  *time.Time         `json:"available_from,omitempty"`
	AvailableUntil *time.Time         `json:"available_until,omitempty"`
	AttemptPolicy  AttemptPolicyView  `json:"attempt_policy"`
	Questions      []QuestionResponse `json:"questions"`
}

type UpdateTestRequest struct {
	TestID      string              `json:"test_id"`
	Title       string              `json:"title,omitempty"`
	Description string              `json:"description,omitempty"`
	Questions   []Question          `json:"questions,omitempty"`
	Settings    *UpdateTestSettings `json:"settings,omitempty"`
}

type DeleteTestRequest struct {
	TestID string `json:"test_id" binding:"required"`
}

type UpdateTestSettings struct {
	DurationSec    *int                  `json:"duration_sec"`
	AllowGuests    *bool                 `json:"allow_guests,omitempty"`
	AvailableFrom  *time.Time            `json:"available_from"`
	AvailableUntil *time.Time            `json:"available_until"`
	AttemptPolicy  *AttemptPolicyPayload `json:"attempt_policy,omitempty"`
}

type AttemptPolicyView struct {
	ShuffleQuestions     bool   `json:"shuffle_questions"`
	ShuffleAnswers       bool   `json:"shuffle_answers"`
	MaxQuestions         int    `json:"max_questions"`
	QuestionTimeLimitSec int64  `json:"question_time_limit_sec"`
	MaxAttemptTimeSec    int64  `json:"max_attempt_time_sec"`
	RequireAllAnswered   bool   `json:"require_all_answered"`
	LockAnswerOnConfirm  bool   `json:"lock_answer_on_confirm"`
	DisableCopy          bool   `json:"disable_copy"`
	DisableBrowserBack   bool   `json:"disable_browser_back"`
	ShowElapsedTime      bool   `json:"show_elapsed_time"`
	AllowNavigation      bool   `json:"allow_navigation"`
	RevealScoreMode      string `json:"reveal_score_mode"`
	RevealSolutions      bool   `json:"reveal_solutions"`
	MaxAttempts          int    `json:"max_attempts"`
}

type AttemptPolicyPayload struct {
	ShuffleQuestions     *bool   `json:"shuffle_questions"`
	ShuffleAnswers       *bool   `json:"shuffle_answers"`
	MaxQuestions         *int    `json:"max_questions"`
	QuestionTimeLimitSec *int64  `json:"question_time_limit_sec"`
	MaxAttemptTimeSec    *int64  `json:"max_attempt_time_sec"`
	RequireAllAnswered   *bool   `json:"require_all_answered"`
	LockAnswerOnConfirm  *bool   `json:"lock_answer_on_confirm"`
	DisableCopy          *bool   `json:"disable_copy"`
	DisableBrowserBack   *bool   `json:"disable_browser_back"`
	ShowElapsedTime      *bool   `json:"show_elapsed_time"`
	AllowNavigation      *bool   `json:"allow_navigation"`
	RevealScoreMode      *string `json:"reveal_score_mode"`
	RevealSolutions      *bool   `json:"reveal_solutions"`
	MaxAttempts          *int    `json:"max_attempts"`
}

type Question struct {
	ID            string   `json:"id"`
	Author        string   `json:"author,omitempty"`
	QuestionText  string   `json:"question_text" binding:"required"`
	Options       []Answer `json:"options" binding:"required,min=2"`
	CorrectOption int      `json:"correct_option"`
	CorrectOptions []int   `json:"correct_options,omitempty"`
	Type          string   `json:"type,omitempty"`   // single | multi | text | code
	Weight        float64  `json:"weight,omitempty"` // default 1
	ImageURL      string   `json:"image_url,omitempty"`
}

type QuestionResponse struct {
	ID            string           `json:"id"`
	QuestionText  string           `json:"question_text"`
	Options       []OptionResponse `json:"options"`
	CorrectOption int              `json:"correct_option"`
	CorrectOptions []int           `json:"correct_options,omitempty"`
	Type          string           `json:"type"`
	Weight        float64          `json:"weight"`
	ImageURL      string           `json:"image_url,omitempty"`
}

type Answer struct {
	AnswerNumber int    `json:"answer" binding:"required"`
	AnswerText   string `json:"answer_text" binding:"required"`
	ImageURL     string `json:"image_url,omitempty"`
}

type OptionResponse struct {
	ID         string `json:"id"`
	OptionText string `json:"option_text"`
	ImageURL   string `json:"image_url,omitempty"`
}
