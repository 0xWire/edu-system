package assignment

import (
	"context"
	"errors"

	"edu-system/internal/testAttempt"
)

type assignmentReadModel struct {
	svc *Service
}

func NewReadModel(svc *Service) testAttempt.AssignmentReadModel {
	return assignmentReadModel{svc: svc}
}

func (a assignmentReadModel) GetAssignment(ctx context.Context, id testAttempt.AssignmentID) (testAttempt.AssignmentDescriptor, error) {
	asg, err := a.svc.Get(ctx, string(id))
	if err != nil {
		switch {
		case errors.Is(err, ErrNotFound):
			return testAttempt.AssignmentDescriptor{}, testAttempt.ErrAssignmentNotFound
		case errors.Is(err, ErrForbidden):
			return testAttempt.AssignmentDescriptor{}, testAttempt.ErrForbidden
		default:
			return testAttempt.AssignmentDescriptor{}, err
		}
	}
	var template *testAttempt.AssignmentTemplate
	if len(asg.Template) > 0 {
		tpl, err := DecodeTemplateSnapshot(asg.Template)
		if err != nil {
			return testAttempt.AssignmentDescriptor{}, err
		}
		template = tpl.ToAssignmentTemplate()
	}
	return testAttempt.AssignmentDescriptor{
		ID:       id,
		TestID:   testAttempt.TestID(asg.TestID),
		OwnerID:  testAttempt.UserID(asg.OwnerID),
		Title:    asg.Title,
		Template: template,
	}, nil
}
