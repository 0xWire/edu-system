package test

type TestRepository interface {
	Create(test *Test) error
	GetByID(id string) (*Test, error)
	GetAll() ([]*Test, error)
	Update(test *Test) error
	Delete(id string) error
}
