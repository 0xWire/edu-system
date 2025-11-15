package test

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
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
	AuthorID    uint           `json:"author_id" gorm:"not null;index"`
	Author      string         `json:"author" gorm:"not null"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Title       string         `json:"title" gorm:"not null"`
	Description string         `json:"description" gorm:"not null"`
	Questions   []Question     `json:"questions" gorm:"foreignKey:TestID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`

	DurationSec    int        `json:"duration_sec" gorm:"not null;default:0"` // 0 = no time limit
	AllowGuests    bool       `json:"allow_guests" gorm:"not null;default:false"`
	AvailableFrom  *time.Time `json:"available_from" gorm:"index"`
	AvailableUntil *time.Time `json:"available_until" gorm:"index"`
	AttemptPolicy  []byte     `json:"attempt_policy" gorm:"type:json;not null;default:'{}'"`
}

func (t *Test) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	if len(t.AttemptPolicy) == 0 {
		t.AttemptPolicy = []byte("{}")
	}
	return nil
}
