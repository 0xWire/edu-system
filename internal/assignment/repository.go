package assignment

import "context"

type Repository interface {
	Create(ctx context.Context, a *Assignment) error
	GetByID(ctx context.Context, id string) (*Assignment, error)
	ListByOwner(ctx context.Context, ownerID uint) ([]Assignment, error)
}
