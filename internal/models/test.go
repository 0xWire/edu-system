package models

import (
	"gorm.io/gorm"
	"time"
)

type Question struct {
	ID            string         `json:"id" gorm:"primaryKey;type:uuid;default:uuid_generate_v4()"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
	TestID        string         `json:"test_id" gorm:"not null;type:uuid;index"`
	QuestionText  string         `json:"question" gorm:"not null"`
	Options       []Option       `json:"options" gorm:"foreignKey:QuestionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	CorrectOption int            `json:"correct_option" gorm:"not null"`
	ImageURL      string         `json:"image_url,omitempty" gorm:"type:varchar(255)"`
}

type Option struct {
	ID         string         `json:"id" gorm:"primaryKey;type:uuid;default:uuid_generate_v4()"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
	QuestionID string         `json:"question_id" gorm:"not null;type:uuid;index"`
	OptionText string         `json:"option_text" gorm:"not null"`
	ImageURL   string         `json:"image_url,omitempty" gorm:"type:varchar(255)"`
}

type Test struct {
	ID          string         `json:"id" gorm:"primaryKey;type:uuid;default:uuid_generate_v4()"`
	Author      string         `json:"author" gorm:"not null"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description" gorm:"not null"`
	Questions   []Question     `json:"questions" gorm:"foreignKey:TestID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}
