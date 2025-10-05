package assignment

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"

	"edu-system/internal/test"
)

var (
	ErrForbidden = errors.New("forbidden")
	ErrNotFound  = errors.New("assignment not found")
)

type Service struct {
	repo  Repository
	tests test.TestRepository
	clock func() time.Time
}

func NewService(repo Repository, tests test.TestRepository) *Service {
	return &Service{repo: repo, tests: tests, clock: func() time.Time { return time.Now().UTC() }}
}

func (s *Service) Create(ctx context.Context, ownerID uint, testID string, title string) (*Assignment, error) {
	t, err := s.tests.GetByID(testID)
	if err != nil {
		return nil, err
	}
	if t.AuthorID != ownerID {
		return nil, ErrForbidden
	}

	name := strings.TrimSpace(title)
	if name == "" {
		name = t.Title
	}

	a := &Assignment{
		ID:        uuid.NewString(),
		TestID:    testID,
		OwnerID:   ownerID,
		Title:     name,
		CreatedAt: s.clock(),
	}

	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) Get(ctx context.Context, id string) (*Assignment, error) {
	a, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) ListByOwner(ctx context.Context, ownerID uint) ([]Assignment, error) {
	return s.repo.ListByOwner(ctx, ownerID)
}
