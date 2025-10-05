package dto

type CreateAssignmentRequest struct {
	TestID string `json:"test_id" binding:"required"`
	Title  string `json:"title"`
}

type AssignmentView struct {
	AssignmentID string `json:"assignment_id"`
	TestID       string `json:"test_id"`
	Title        string `json:"title"`
	ShareURL     string `json:"share_url"`
}
