package platform

import (
	"context"
	"edu-system/internal/testAttempt"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

type SystemClock struct{}

func (SystemClock) Now() time.Time { return time.Now().UTC() }

type GormTransactor struct{ DB *gorm.DB }

func (t GormTransactor) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error {
	return t.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error { return fn(ctx) })
}

// AllowGuestsAndOwnerPolicy defines access rules for test attempts.
// - Start: allowed for authenticated users, or guests if the test allows it and a guest name is provided.
// - Modify: allowed for the owner of the attempt, or for the guest who started it.
type AllowGuestsAndOwnerPolicy struct {
	Tests testAttempt.TestReadModel
}

func (p AllowGuestsAndOwnerPolicy) CanStartAttempt(_ context.Context, userID *testAttempt.UserID, guestName *string, _ testAttempt.TestID) error {
	if userID != nil {
		return nil
	}

	if guestName == nil || strings.TrimSpace(*guestName) == "" {
		return fmt.Errorf("guest name required")
	}
	return nil
}

func (p AllowGuestsAndOwnerPolicy) CanModifyAttempt(ctx context.Context, userID *testAttempt.UserID, a *testAttempt.Attempt) error {
	if a.GuestName() != nil && userID == nil {
		return nil
	}
	if userID != nil && *userID == a.User() {
		return nil
	}
	return fmt.Errorf("forbidden")
}
