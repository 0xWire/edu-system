package main

import (
	"encoding/json"
	"time"
)

// ---------------------------------------------------------------------------
// DB row structs — mirror internal repo rows without importing them
// ---------------------------------------------------------------------------

type userRow struct {
	ID        uint      `gorm:"primarykey"`
	CreatedAt time.Time
	UpdatedAt time.Time
	Email     string `gorm:"uniqueIndex;not null"`
	Password  string `gorm:"not null"`
	FirstName string `gorm:"not null"`
	LastName  string `gorm:"not null"`
	Role      string `gorm:"default:user"`
}

func (userRow) TableName() string { return "users" }

type testRow struct {
	ID             string     `gorm:"primaryKey;type:varchar(36)"`
	AuthorID       uint       `gorm:"not null;index"`
	Author         string     `gorm:"not null"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
	Title          string     `gorm:"not null"`
	Description    string     `gorm:"not null"`
	DurationSec    int        `gorm:"not null;default:0"`
	AllowGuests    bool       `gorm:"not null;default:false"`
	AvailableFrom  *time.Time
	AvailableUntil *time.Time
	AttemptPolicy  []byte `gorm:"type:json;not null;default:'{}'"`
}

func (testRow) TableName() string { return "tests" }

type questionRow struct {
	ID            string    `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	TestID        string  `gorm:"not null;type:varchar(36);index"`
	QuestionText  string  `gorm:"not null"`
	Type          string  `gorm:"type:varchar(16);not null;default:'single'"`
	CorrectOption int     `gorm:"not null"`
	CorrectJSON   []byte  `gorm:"type:json"`
	Weight        float64 `gorm:"not null;default:1"`
}

func (questionRow) TableName() string { return "questions" }

type optionRow struct {
	ID         string    `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	QuestionID string `gorm:"not null;type:varchar(36);index"`
	OptionText string `gorm:"not null"`
}

func (optionRow) TableName() string { return "options" }

type assignmentRow struct {
	ID               string    `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt        time.Time
	UpdatedAt        time.Time
	TestID           string `gorm:"not null;type:varchar(36);index"`
	OwnerID          uint   `gorm:"not null;index"`
	Title            string `gorm:"type:varchar(255)"`
	Comment          string `gorm:"type:varchar(500)"`
	TemplateSnapshot []byte `gorm:"type:json"`
}

func (assignmentRow) TableName() string { return "test_assignments" }

type attemptRow struct {
	ID                    string          `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt             time.Time
	UpdatedAt             time.Time
	AssignmentID          string          `gorm:"not null;type:varchar(36);index"`
	TestID                string          `gorm:"not null;type:varchar(36);index"`
	UserID                uint64          `gorm:"not null;index"`
	GuestName             *string         `gorm:"type:varchar(64);null"`
	ParticipantFieldsJSON json.RawMessage `gorm:"type:json"`
	StartedAt             time.Time       `gorm:"not null;index"`
	SubmittedAt           *time.Time
	ExpiredAt             *time.Time
	Status                string  `gorm:"type:varchar(16);not null;default:'active';index"`
	DurationSec           int     `gorm:"not null;default:0"`
	Version               int     `gorm:"not null;default:0"`
	Seed                  int64   `gorm:"not null;default:0"`
	Score                 float64 `gorm:"not null;default:0"`
	MaxScore              float64 `gorm:"not null;default:0"`
	PendingScore          float64 `gorm:"not null;default:0"`
	ClientIP              string  `gorm:"type:varchar(64)"`
	ClientFingerprint     string  `gorm:"type:varchar(128)"`
	QuestionOpenedAt      *time.Time
	PolicyJSON            json.RawMessage `gorm:"type:json;not null;default:'{}'"`
	OrderJSON             json.RawMessage `gorm:"type:json;not null"`
	Cursor                int             `gorm:"not null;default:0"`
}

func (attemptRow) TableName() string { return "test_attempts" }

type answerRow struct {
	ID         string          `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
	AttemptID  string          `gorm:"not null;type:varchar(36);index;uniqueIndex:ux_attempt_question,priority:1"`
	QuestionID string          `gorm:"not null;type:varchar(36);uniqueIndex:ux_attempt_question,priority:2"`
	Payload    json.RawMessage `gorm:"type:json;not null"`
	IsCorrect  *bool           `gorm:"index"`
	Score      *float64
}

func (answerRow) TableName() string { return "selected_answers" }

// ---------------------------------------------------------------------------
// Attempt policy helpers
// ---------------------------------------------------------------------------

type attemptPolicy struct {
	ShuffleQuestions  bool   `json:"shuffle_questions"`
	ShuffleAnswers    bool   `json:"shuffle_answers"`
	RevealScoreMode   string `json:"reveal_score_mode,omitempty"`
	RevealSolutions   bool   `json:"reveal_solutions"`
	MaxAttempts       int    `json:"max_attempts,omitempty"`
	MaxAttemptTimeSec int    `json:"max_attempt_time_sec,omitempty"`
}

func defaultPolicy() []byte {
	b, _ := json.Marshal(attemptPolicy{
		ShuffleQuestions: true,
		ShuffleAnswers:   true,
		RevealScoreMode:  "after_submit",
		RevealSolutions:  true,
		MaxAttempts:      3,
	})
	return b
}

func timedPolicy(durationSec int) []byte {
	b, _ := json.Marshal(attemptPolicy{
		ShuffleQuestions:  true,
		ShuffleAnswers:    true,
		RevealScoreMode:   "after_submit",
		RevealSolutions:   false,
		MaxAttempts:       2,
		MaxAttemptTimeSec: durationSec,
	})
	return b
}
