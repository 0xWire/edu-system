package repository

import (
	"edu-system/internal/models"
	"gorm.io/gorm"
)

type TestRepository interface {
	Create(test *models.Test) error
	GetByID(id string) (*models.Test, error)
	GetAll() ([]*models.Test, error)
	Update(test *models.Test) error
	Delete(id string) error
}

type testRepository struct {
	db *gorm.DB
}

func NewTestRepository(db *gorm.DB) TestRepository {
	return &testRepository{db: db}
}

func (r *testRepository) Create(test *models.Test) error {
	return r.db.Create(test).Error
}

func (r *testRepository) GetByID(id string) (*models.Test, error) {
	var test models.Test
	err := r.db.Preload("Questions.Options").First(&test, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &test, nil
}

func (r *testRepository) GetAll() ([]*models.Test, error) {
	var tests []*models.Test
	err := r.db.Preload("Questions.Options").Find(&tests).Error
	if err != nil {
		return nil, err
	}
	return tests, nil
}

func (r *testRepository) Update(test *models.Test) error {
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).Save(test).Error
}

func (r *testRepository) Delete(id string) error {
	return r.db.Delete(&models.Test{}, "id = ?", id).Error
}
