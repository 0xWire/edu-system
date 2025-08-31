package testAttempt

type CreateTestAttemptRequest struct {
	TestID   string `json:"test_id" binding:"required"`
	Username string `json:"username" binding:"required"`
}

type SubmitTestAttemptRequest struct {
	AttemptID       string           `json:"attempt_id" binding:"required"`
	SelectedAnswers []SelectedAnswer `json:"selected_answers" binding:"required,min=1"`
}

type SelectedAnswer struct {
	QuestionID     string `json:"question_id" binding:"required"`
	SelectedOption int    `json:"selected_option" binding:"required,min=0"`
}

type GetTestAttemptResponse struct {
	AttemptID       string           `json:"attempt_id"`
	TestID          string           `json:"test_id"`
	Username        string           `json:"username"`
	Score           int              `json:"score"`
	TotalQuestions  int              `json:"total_questions"`
	Completed       bool             `json:"completed"`
	SelectedAnswers []SelectedAnswer `json:"selected_answers,omitempty"`
}
