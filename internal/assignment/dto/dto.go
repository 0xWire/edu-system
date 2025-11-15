package dto

type CreateAssignmentRequest struct {
	TestID string `json:"test_id" binding:"required"`
	Title  string `json:"title"`
}

type AssignmentView struct {
	AssignmentID      string `json:"assignment_id"`
	TestID            string `json:"test_id"`
	Title             string `json:"title"`
	ShareURL          string `json:"share_url"`
	ManageURL         string `json:"manage_url,omitempty"`
	DurationSec       int    `json:"duration_sec,omitempty"`
	MaxAttemptTimeSec int64  `json:"max_attempt_time_sec,omitempty"`
	IsOwner           bool   `json:"is_owner"`
}
