package testAttempt

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type TestAttempt struct {
	ID              string           `json:"id" gorm:"primaryKey;type:varchar(36)"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	DeletedAt       gorm.DeletedAt   `json:"-" gorm:"index"`
	TestID          string           `json:"test_id" gorm:"not null;type:varchar(36);index"`
	Username        string           `json:"username" gorm:"not null;index"`
	Score           int              `json:"score" gorm:"not null;default:0"`
	TotalQuestions  int              `json:"total_questions" gorm:"not null;default:0"`
	Completed       bool             `json:"completed" gorm:"not null;default:false"`
	SelectedAnswers []SelectedAnswer `json:"selected_answers" gorm:"foreignKey:AttemptID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (ta *TestAttempt) BeforeCreate(tx *gorm.DB) error {
	if ta.ID == "" {
		ta.ID = uuid.New().String()
	}
	return nil
}

type SelectedAnswer struct {
	ID             string         `json:"id" gorm:"primaryKey;type:varchar(36)"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
	AttemptID      string         `json:"attempt_id" gorm:"not null;type:varchar(36);index"`
	QuestionID     string         `json:"question_id" gorm:"not null;type:varchar(36)"`
	SelectedOption int            `json:"selected_option" gorm:"not null"`
}

func (sa *SelectedAnswer) BeforeCreate(tx *gorm.DB) error {
	if sa.ID == "" {
		sa.ID = uuid.New().String()
	}
	return nil
}
