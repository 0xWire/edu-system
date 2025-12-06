package dto

import "time"

type StartAttemptRequest struct {
	AssignmentID string  `json:"assignment_id" validate:"required,uuid4"`
	GuestName    *string `json:"guest_name,omitempty" validate:"omitempty,min=1,max=64"`
	Fingerprint  *string `json:"fingerprint,omitempty" validate:"omitempty,min=6,max=128"`
}

type StartAttemptResponse struct {
	Attempt AttemptView `json:"attempt"`
}

type AttemptView struct {
	AttemptID    string            `json:"attempt_id"`
	AssignmentID string            `json:"assignment_id"`
	Status       string            `json:"status"`
	Version      int               `json:"version"`
	TimeLeftSec  int64             `json:"time_left_sec"`
	Total        int               `json:"total"`
	Cursor       int               `json:"cursor"`
	GuestName    string            `json:"guest_name,omitempty"`
	Policy       AttemptPolicyView `json:"policy"`
}

type AttemptPolicyView struct {
	ShuffleQuestions     bool   `json:"shuffle_questions"`
	ShuffleAnswers       bool   `json:"shuffle_answers"`
	RequireAllAnswered   bool   `json:"require_all_answered"`
	LockAnswerOnConfirm  bool   `json:"lock_answer_on_confirm"`
	DisableCopy          bool   `json:"disable_copy"`
	DisableBrowserBack   bool   `json:"disable_browser_back"`
	ShowElapsedTime      bool   `json:"show_elapsed_time"`
	AllowNavigation      bool   `json:"allow_navigation"`
	QuestionTimeLimitSec int64  `json:"question_time_limit_sec"`
	MaxAttemptTimeSec    int64  `json:"max_attempt_time_sec"`
	RevealScoreMode      string `json:"reveal_score_mode"`
	RevealSolutions      bool   `json:"reveal_solutions"`
}

type NextQuestionResponse struct {
	Attempt  AttemptView  `json:"attempt"`
	Question QuestionView `json:"question"`
}

type QuestionView struct {
	ID           string       `json:"id"`
	Type         string       `json:"type,omitempty"`
	QuestionText string       `json:"question_text"`
	ImageURL     string       `json:"image_url,omitempty"`
	Weight       float64      `json:"weight,omitempty"`
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

type AttemptSummaryResponse struct {
	Attempts []AttemptSummaryView `json:"attempts"`
}

type AttemptSummaryView struct {
	AttemptID    string          `json:"attempt_id"`
	AssignmentID string          `json:"assignment_id"`
	TestID       string          `json:"test_id"`
	Status       string          `json:"status"`
	StartedAt    time.Time       `json:"started_at"`
	SubmittedAt  *time.Time      `json:"submitted_at,omitempty"`
	ExpiredAt    *time.Time      `json:"expired_at,omitempty"`
	DurationSec  int             `json:"duration_sec"`
	Score        float64         `json:"score"`
	MaxScore     float64         `json:"max_score"`
	PendingScore float64         `json:"pending_score,omitempty"`
	Participant  ParticipantView `json:"participant"`
}

type ParticipantView struct {
	Kind   string  `json:"kind"`
	Name   string  `json:"name"`
	UserID *uint64 `json:"user_id,omitempty"`
}

type AttemptDetailsResponse struct {
	Attempt AttemptDetailsView     `json:"attempt"`
	Answers []AnsweredQuestionView `json:"answers"`
}

type AttemptDetailsView struct {
	AttemptID    string          `json:"attempt_id"`
	AssignmentID string          `json:"assignment_id"`
	TestID       string          `json:"test_id"`
	Status       string          `json:"status"`
	StartedAt    time.Time       `json:"started_at"`
	SubmittedAt  *time.Time      `json:"submitted_at,omitempty"`
	ExpiredAt    *time.Time      `json:"expired_at,omitempty"`
	DurationSec  int             `json:"duration_sec"`
	Score        float64         `json:"score"`
	MaxScore     float64         `json:"max_score"`
	PendingScore float64         `json:"pending_score,omitempty"`
	Participant  ParticipantView `json:"participant"`
}

type AnsweredQuestionView struct {
	QuestionID   string               `json:"question_id"`
	QuestionText string               `json:"question_text"`
	ImageURL     string               `json:"image_url,omitempty"`
	Kind         string               `json:"kind"`
	Weight       float64              `json:"weight,omitempty"`
	Options      []AnsweredOptionView `json:"options,omitempty"`
	TextAnswer   string               `json:"text_answer,omitempty"`
	CodeAnswer   *CodeAnswerView      `json:"code_answer,omitempty"`
	IsCorrect    *bool                `json:"is_correct,omitempty"`
	Score        *float64             `json:"score,omitempty"`
}

type AnsweredOptionView struct {
	ID         string `json:"id"`
	OptionText string `json:"option_text"`
	ImageURL   string `json:"image_url,omitempty"`
	Selected   bool   `json:"selected"`
}

type CodeAnswerView struct {
	Lang string `json:"lang"`
	Body string `json:"body"`
}

type GradeAnswerRequest struct {
	QuestionID string  `json:"question_id" validate:"required,uuid4"`
	Score      float64 `json:"score" validate:"gte=0"`
	IsCorrect  *bool   `json:"is_correct,omitempty"`
}

type GradeAnswerResponse struct {
	Attempt AttemptDetailsView `json:"attempt"`
}
