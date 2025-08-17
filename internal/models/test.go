package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Question struct {
	ID            string         `json:"id" gorm:"primaryKey;type:varchar(36)"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
	TestID        string         `json:"test_id" gorm:"not null;type:varchar(36);index"`
	QuestionText  string         `json:"question_text" gorm:"not null"`
	Options       []Option       `json:"options" gorm:"foreignKey:QuestionID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	CorrectOption int            `json:"correct_option" gorm:"not null"`
	ImageURL      string         `json:"image_url,omitempty" gorm:"type:varchar(255)"`
}

func (q *Question) BeforeCreate(tx *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.New().String()
	}
	return nil
}

type Option struct {
	ID         string         `json:"id" gorm:"primaryKey;type:varchar(36)"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`
	QuestionID string         `json:"question_id" gorm:"not null;type:varchar(36);index"`
	OptionText string         `json:"option_text" gorm:"not null"`
	ImageURL   string         `json:"image_url,omitempty" gorm:"type:varchar(255)"`
}

func (o *Option) BeforeCreate(tx *gorm.DB) error {
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	return nil
}

type Test struct {
	ID          string         `json:"id" gorm:"primaryKey;type:varchar(36)"`
	Author      string         `json:"author" gorm:"not null"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description" gorm:"not null"`
	Questions   []Question     `json:"questions" gorm:"foreignKey:TestID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
}

func (t *Test) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}
