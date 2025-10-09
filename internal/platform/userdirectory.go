package platform

import (
	"context"

	"edu-system/internal/auth"
	"edu-system/internal/testAttempt"
	"gorm.io/gorm"
)

type GormUserDirectory struct {
	DB *gorm.DB
}

func (d GormUserDirectory) Lookup(ctx context.Context, ids []testAttempt.UserID) (map[testAttempt.UserID]testAttempt.UserInfo, error) {
	if len(ids) == 0 {
		return map[testAttempt.UserID]testAttempt.UserInfo{}, nil
	}
	unique := make([]uint64, 0, len(ids))
	seen := make(map[uint64]struct{}, len(ids))
	for _, id := range ids {
		if id == 0 {
			continue
		}
		uid := uint64(id)
		if _, ok := seen[uid]; ok {
			continue
		}
		seen[uid] = struct{}{}
		unique = append(unique, uid)
	}
	if len(unique) == 0 {
		return map[testAttempt.UserID]testAttempt.UserInfo{}, nil
	}
	uintIDs := make([]uint, len(unique))
	for i, id := range unique {
		uintIDs[i] = uint(id)
	}

	var users []auth.User
	if err := d.DB.WithContext(ctx).Where("id IN ?", uintIDs).Find(&users).Error; err != nil {
		return nil, err
	}

	result := make(map[testAttempt.UserID]testAttempt.UserInfo, len(users))
	for _, u := range users {
		result[testAttempt.UserID(u.ID)] = testAttempt.UserInfo{
			ID:        testAttempt.UserID(u.ID),
			FirstName: u.FirstName,
			LastName:  u.LastName,
		}
	}

	return result, nil
}
