package assignmentrepo

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"edu-system/internal/assignment"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(&assignmentRow{})
}

func (r *Repository) Create(ctx context.Context, a *assignment.Assignment) error {
	row := fromDomain(a)
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return err
	}
	a.CreatedAt = row.CreatedAt
	return nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*assignment.Assignment, error) {
	var row assignmentRow
	if err := r.db.WithContext(ctx).First(&row, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, assignment.ErrNotFound
		}
		return nil, err
	}
	return toDomain(&row), nil
}

func (r *Repository) ListByOwner(ctx context.Context, ownerID uint) ([]assignment.Assignment, error) {
	var rows []assignmentRow
	if err := r.db.WithContext(ctx).Where("owner_id = ?", ownerID).Order("created_at desc").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]assignment.Assignment, 0, len(rows))
	for _, row := range rows {
		out = append(out, *toDomain(&row))
	}
	return out, nil
}

func fromDomain(a *assignment.Assignment) assignmentRow {
	return assignmentRow{
		ID:               a.ID,
		TestID:           a.TestID,
		OwnerID:          a.OwnerID,
		Title:            a.Title,
		Comment:          a.Comment,
		CreatedAt:        a.CreatedAt,
		TemplateSnapshot: []byte(a.Template),
	}
}

func toDomain(row *assignmentRow) *assignment.Assignment {
	return &assignment.Assignment{
		ID:        row.ID,
		TestID:    row.TestID,
		OwnerID:   row.OwnerID,
		Title:     row.Title,
		Comment:   row.Comment,
		CreatedAt: row.CreatedAt,
		Template:  row.TemplateSnapshot,
	}
}

type assignmentRow struct {
	ID        string `gorm:"primaryKey;type:varchar(36)"`
	CreatedAt time.Time
	UpdatedAt time.Time

	TestID           string `gorm:"not null;type:varchar(36);index"`
	OwnerID          uint   `gorm:"not null;index"`
	Title            string `gorm:"type:varchar(255)"`
	Comment          string `gorm:"type:varchar(500)"`
	TemplateSnapshot []byte `gorm:"type:json"`
}

func (assignmentRow) TableName() string { return "test_assignments" }
