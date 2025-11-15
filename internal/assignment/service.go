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

type TestSettingsSummary struct {
	DurationSec       int
	MaxAttemptTimeSec int64
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

	snapshot, err := BuildTemplateSnapshot(t)
	if err != nil {
		return nil, err
	}
	rawSnapshot, err := snapshot.Marshal()
	if err != nil {
		return nil, err
	}

	a := &Assignment{
		ID:        uuid.NewString(),
		TestID:    testID,
		OwnerID:   ownerID,
		Title:     name,
		CreatedAt: s.clock(),
		Template:  rawSnapshot,
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

func (s *Service) GetTestSettings(ctx context.Context, testID string) (*TestSettingsSummary, error) {
	durationSec, _, _, _, policy, err := s.tests.GetTestSettings(ctx, testID)
	if err != nil {
		return nil, err
	}

	summary := &TestSettingsSummary{
		DurationSec: durationSec,
	}
	if policy.MaxAttemptTime > 0 {
		summary.MaxAttemptTimeSec = int64(policy.MaxAttemptTime / time.Second)
	} else if durationSec > 0 {
		summary.MaxAttemptTimeSec = int64(durationSec)
	}

	return summary, nil
}

func (s *Service) ListByOwner(ctx context.Context, ownerID uint) ([]Assignment, error) {
	return s.repo.ListByOwner(ctx, ownerID)
}
