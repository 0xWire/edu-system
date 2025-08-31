package authrepo

import (
	"edu-system/internal/auth"
	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) auth.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *auth.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) GetByEmail(email string) (*auth.User, error) {
	var user auth.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByID(id uint) (*auth.User, error) {
	var user auth.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(user *auth.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&auth.User{}, id).Error
}
