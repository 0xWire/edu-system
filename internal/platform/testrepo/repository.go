package testrepo

import (
	"edu-system/internal/test"
	"gorm.io/gorm"
)

type testRepository struct {
	db *gorm.DB
}

func NewTestRepository(db *gorm.DB) test.TestRepository {
	return &testRepository{db: db}
}

func (r *testRepository) Create(test *test.Test) error {
	return r.db.Create(test).Error
}

func (r *testRepository) GetByID(id string) (*test.Test, error) {
	var test test.Test
	err := r.db.Preload("Questions.Options").First(&test, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &test, nil
}

func (r *testRepository) GetAll() ([]*test.Test, error) {
	var tests []*test.Test
	err := r.db.Preload("Questions.Options").Find(&tests).Error
	if err != nil {
		return nil, err
	}
	return tests, nil
}

func (r *testRepository) Update(test *test.Test) error {
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).Save(test).Error
}

func (r *testRepository) Delete(id string) error {
	return r.db.Delete(&test.Test{}, "id = ?", id).Error
}
