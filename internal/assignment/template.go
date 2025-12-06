package assignment

import (
	"bytes"
	"encoding/json"
	"time"

	"edu-system/internal/test"
	"edu-system/internal/testAttempt"
)

type TemplateSnapshot struct {
	TestID         string                     `json:"test_id"`
	Title          string                     `json:"title"`
	Description    string                     `json:"description"`
	DurationSec    int                        `json:"duration_sec"`
	AllowGuests    bool                       `json:"allow_guests"`
	AvailableFrom  *time.Time                 `json:"available_from,omitempty"`
	AvailableUntil *time.Time                 `json:"available_until,omitempty"`
	AttemptPolicy  testAttempt.AttemptPolicy  `json:"attempt_policy"`
	Questions      []TemplateQuestionSnapshot `json:"questions"`
	Fields         []TemplateField            `json:"fields,omitempty"`
}

type TemplateField struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Required bool   `json:"required"`
}

type TemplateQuestionSnapshot struct {
	ID             string                   `json:"id"`
	Type           string                   `json:"type,omitempty"`
	QuestionText   string                   `json:"question_text"`
	ImageURL       string                   `json:"image_url,omitempty"`
	CorrectOption  int                      `json:"correct_option"`
	CorrectOptions []int                    `json:"correct_options,omitempty"`
	Weight         float64                  `json:"weight,omitempty"`
	Options        []TemplateOptionSnapshot `json:"options"`
}

type TemplateOptionSnapshot struct {
	ID         string `json:"id"`
	OptionText string `json:"option_text"`
	ImageURL   string `json:"image_url,omitempty"`
}

func BuildTemplateSnapshot(src *test.Test) (*TemplateSnapshot, error) {
	if src == nil {
		return nil, nil
	}
	policy, err := decodeAttemptPolicy(src.AttemptPolicy, src.DurationSec)
	if err != nil {
		return nil, err
	}
	snapshot := &TemplateSnapshot{
		TestID:         src.ID,
		Title:          src.Title,
		Description:    src.Description,
		DurationSec:    src.DurationSec,
		AllowGuests:    src.AllowGuests,
		AvailableFrom:  src.AvailableFrom,
		AvailableUntil: src.AvailableUntil,
		AttemptPolicy:  policy,
		Questions:      make([]TemplateQuestionSnapshot, 0, len(src.Questions)),
	}
	for _, q := range src.Questions {
		qType := normalizeQuestionType(q.Type, len(q.Options))
		weight := normalizeWeight(q.Weight)
		tq := TemplateQuestionSnapshot{
			ID:             q.ID,
			Type:           qType,
			QuestionText:   q.QuestionText,
			ImageURL:       q.ImageURL,
			CorrectOption:  q.CorrectOption,
			CorrectOptions: decodeCorrectOptions(q.CorrectJSON),
			Weight:         weight,
			Options:        make([]TemplateOptionSnapshot, 0, len(q.Options)),
		}
		for _, o := range q.Options {
			tq.Options = append(tq.Options, TemplateOptionSnapshot{
				ID:         o.ID,
				OptionText: o.OptionText,
				ImageURL:   o.ImageURL,
			})
		}
		snapshot.Questions = append(snapshot.Questions, tq)
	}
	return snapshot, nil
}

func (tpl *TemplateSnapshot) Marshal() (json.RawMessage, error) {
	if tpl == nil {
		return nil, nil
	}
	data, err := json.Marshal(tpl)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(data), nil
}

func DecodeTemplateSnapshot(raw json.RawMessage) (*TemplateSnapshot, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var tpl TemplateSnapshot
	if err := json.Unmarshal(raw, &tpl); err != nil {
		return nil, err
	}
	return &tpl, nil
}

func (tpl *TemplateSnapshot) ToAssignmentTemplate() *testAttempt.AssignmentTemplate {
	if tpl == nil {
		return nil
	}
	out := &testAttempt.AssignmentTemplate{
		TestID:         testAttempt.TestID(tpl.TestID),
		Title:          tpl.Title,
		Description:    tpl.Description,
		DurationSec:    tpl.DurationSec,
		AllowGuests:    tpl.AllowGuests,
		AvailableFrom:  tpl.AvailableFrom,
		AvailableUntil: tpl.AvailableUntil,
		Policy:         tpl.AttemptPolicy,
		Questions:      make([]testAttempt.TemplateQuestion, 0, len(tpl.Questions)),
	}
	for _, q := range tpl.Questions {
		tq := testAttempt.TemplateQuestion{
			ID:             testAttempt.QuestionID(q.ID),
			Type:           normalizeQuestionType(q.Type, len(q.Options)),
			QuestionText:   q.QuestionText,
			ImageURL:       q.ImageURL,
			CorrectOption:  q.CorrectOption,
			CorrectOptions: q.CorrectOptions,
			Weight:         normalizeWeight(q.Weight),
			Options:        make([]testAttempt.TemplateOption, 0, len(q.Options)),
		}
		for _, o := range q.Options {
			tq.Options = append(tq.Options, testAttempt.TemplateOption{
				ID:         o.ID,
				OptionText: o.OptionText,
				ImageURL:   o.ImageURL,
			})
		}
		out.Questions = append(out.Questions, tq)
	}
	return out
}

func decodeAttemptPolicy(raw []byte, durationSec int) (testAttempt.AttemptPolicy, error) {
	raw = bytes.TrimSpace(raw)
	policy := testAttempt.AttemptPolicy{
		ShuffleQuestions: true,
		ShuffleAnswers:   true,
	}
	if len(raw) != 0 && !bytes.Equal(raw, []byte("null")) && !bytes.Equal(raw, []byte("{}")) {
		if err := json.Unmarshal(raw, &policy); err != nil {
			return testAttempt.AttemptPolicy{}, err
		}
	}
	if policy.MaxAttemptTime <= 0 && durationSec > 0 {
		policy.MaxAttemptTime = time.Duration(durationSec) * time.Second
	}
	return policy, nil
}

func normalizeQuestionType(tpe string, optionsLen int) string {
	switch tpe {
	case "multi", "text", "code", "single":
		return tpe
	}
	if optionsLen == 0 {
		return "text"
	}
	return "single"
}

func normalizeWeight(w float64) float64 {
	if w <= 0 {
		return 1
	}
	return w
}

func decodeCorrectOptions(raw []byte) []int {
	if len(raw) == 0 {
		return nil
	}
	var obj map[string]any
	if err := json.Unmarshal(raw, &obj); err != nil {
		return nil
	}
	val, ok := obj["selected"]
	if !ok {
		return nil
	}
	arr, _ := val.([]any)
	out := make([]int, 0, len(arr))
	for _, v := range arr {
		if f, ok := v.(float64); ok {
			out = append(out, int(f))
		}
	}
	return out
}
