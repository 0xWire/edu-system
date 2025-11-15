package assignment

import "encoding/json"

import "time"

type Assignment struct {
	ID        string
	TestID    string
	OwnerID   uint
	Title     string
	CreatedAt time.Time
	Template  json.RawMessage
}

type AssignmentDescriptor struct {
	ID      string
	TestID  string
	OwnerID uint
	Title   string
}

func (a Assignment) Descriptor() AssignmentDescriptor {
	return AssignmentDescriptor{
		ID:      a.ID,
		TestID:  a.TestID,
		OwnerID: a.OwnerID,
		Title:   a.Title,
	}
}
