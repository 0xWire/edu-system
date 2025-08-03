package dto

type CreateTestRequest struct {
	Author      string     `json:"author"`
	Title       string     `json:"title" binding:"required"`
	Description string     `json:"description" binding:"required"`
	Questions   []Question `json:"questions" binding:"required,min=1"`
}

type GetTestResponse struct {
	Author      string     `json:"author"`
	TestID      string     `json:"test_id" binding:"required"`
	Title       string     `json:"title" binding:"required"`
	Description string     `json:"description" binding:"required"`
	Questions   []Question `json:"questions" binding:"required,min=1"`
}

type UpdateTestRequest struct {
	TestID      string     `json:"test_id" binding:"required"`
	Title       string     `json:"title,omitempty"`
	Description string     `json:"description,omitempty"`
	Questions   []Question `json:"questions,omitempty"`
}

type DeleteTestRequest struct {
	TestID string `json:"test_id" binding:"required"`
}

type Question struct {
	ID            string   `json:"id" gorm:"primarykey"`
	Author        string   `json:"author,omitempty" binding:"required" :"author"`
	QuestionText  string   `json:"question_text" binding:"required" :"question_text"`
	Options       []Answer `json:"options" binding:"required,min=2" :"options"`
	CorrectOption int      `json:"correct_option" binding:"required,min=0" :"correct_option"`
	ImageURL      string   `json:"image_url,omitempty" :"image_url"`
}

type Answer struct {
	AnswerNumber int    `json:"answer" binding:"required"`
	AnswerText   string `json:"answer_text" binding:"required"`
	ImageURL     string `json:"image_url,omitempty"`
}
