package auth

type UserRepository interface {
	Create(user *User) error
	GetByEmail(email string) (*User, error)
	GetByID(id uint) (*User, error)
	Update(user *User) error
	Delete(id uint) error
}
