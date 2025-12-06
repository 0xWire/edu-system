package test

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"sort"
	"strconv"
	"strings"

	"edu-system/internal/test/dto"
)

func csvTemplateContent() string {
	return strings.TrimSpace(`
title,description,question_text,question_type,options,correct_answers,weight
Sample test,Quick diagnostic quiz,What is 2+2?,single,"4|3|5|2","1",1
,,Select prime numbers,multi,"2|3|4|5","1|2|4",1
,,Explain the purpose of polymorphism (open answer),text,"","",1
,,Write a function that reverses a string,code,"","",1
,,What is the derivative of $x^2$?,single,"2x|x^2|2|x","1",1
,,"Evaluate $\\int x^2 dx$",single,"\\frac{x^3}{3}+C|2x+C|x^3+C|\\frac{2}{3}x^3+C","1",1
`) + "\n"
}

func parseCSVTemplate(reader io.Reader) (*dto.CreateTestRequest, error) {
	r := csv.NewReader(reader)
	r.TrimLeadingSpace = true
	r.FieldsPerRecord = -1

	rows, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV: %w", err)
	}
	if len(rows) < 2 {
		return nil, errors.New("CSV must include a header row and at least one question")
	}

	header := map[string]int{}
	for idx, name := range rows[0] {
		key := strings.ToLower(strings.TrimSpace(name))
		header[key] = idx
	}

	required := []string{"title", "description", "question_text", "question_type", "options", "correct_answers", "weight"}
	for _, col := range required {
		if _, ok := header[col]; !ok {
			return nil, fmt.Errorf("CSV is missing required column: %s", col)
		}
	}

	var title string
	var description string
	questions := make([]dto.Question, 0)

	for rowIdx, row := range rows[1:] {
		rowNumber := rowIdx + 2 // account for header line
		if isEmptyRow(row) {
			continue
		}

		qText := strings.TrimSpace(valueAt(row, header, "question_text"))
		if qText == "" {
			return nil, fmt.Errorf("row %d: question_text is required", rowNumber)
		}

		if title == "" {
			title = strings.TrimSpace(valueAt(row, header, "title"))
		}
		if description == "" {
			description = strings.TrimSpace(valueAt(row, header, "description"))
		}

		qTypeRaw := strings.TrimSpace(valueAt(row, header, "question_type"))
		if qTypeRaw == "" {
			qTypeRaw = "single"
		}
		qType, err := normalizeCSVQuestionType(qTypeRaw)
		if err != nil {
			return nil, fmt.Errorf("row %d: %w", rowNumber, err)
		}

		weight := parseWeight(valueAt(row, header, "weight"))
		optionTexts := splitList(valueAt(row, header, "options"))
		answers := make([]dto.Answer, 0, len(optionTexts))
		for i, txt := range optionTexts {
			if strings.TrimSpace(txt) == "" {
				continue
			}
			answers = append(answers, dto.Answer{
				AnswerNumber: i,
				AnswerText:   strings.TrimSpace(txt),
			})
		}

		correctValues, err := parseCorrectIndexes(valueAt(row, header, "correct_answers"), len(answers))
		if err != nil {
			return nil, fmt.Errorf("row %d: %w", rowNumber, err)
		}

		question := dto.Question{
			QuestionText: qText,
			Options:      answers,
			CorrectOption: func() int {
				if len(correctValues) > 0 {
					return correctValues[0]
				}
				return 0
			}(),
			CorrectOptions: correctValues,
			Type:           qType,
			Weight:         weight,
		}

		switch qType {
		case "single":
			if len(answers) == 0 {
				return nil, fmt.Errorf("row %d: at least one option is required for single choice questions", rowNumber)
			}
			if len(correctValues) == 0 {
				question.CorrectOption = 0
				question.CorrectOptions = []int{0}
			}
		case "multi":
			if len(answers) == 0 {
				return nil, fmt.Errorf("row %d: options are required for multi choice questions", rowNumber)
			}
			if len(correctValues) == 0 {
				return nil, fmt.Errorf("row %d: at least one correct answer is required for multi choice questions", rowNumber)
			}
		default: // text or code
			question.Options = []dto.Answer{}
			question.CorrectOption = 0
			question.CorrectOptions = nil
		}

		questions = append(questions, question)
	}

	if title == "" || description == "" {
		return nil, errors.New("title and description must be provided at least once in the CSV file")
	}

	if len(questions) == 0 {
		return nil, errors.New("no questions found in the CSV file")
	}

	return &dto.CreateTestRequest{
		Author:      "",
		Title:       title,
		Description: description,
		Questions:   questions,
	}, nil
}

func valueAt(row []string, header map[string]int, key string) string {
	idx, ok := header[key]
	if !ok || idx >= len(row) {
		return ""
	}
	return row[idx]
}

func isEmptyRow(row []string) bool {
	for _, v := range row {
		if strings.TrimSpace(v) != "" {
			return false
		}
	}
	return true
}

func splitList(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.FieldsFunc(raw, func(r rune) bool {
		return r == '|' || r == ';'
	})
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func parseCorrectIndexes(raw string, optionCount int) ([]int, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	if optionCount == 0 {
		return nil, errors.New("correct_answers provided but no answer options found")
	}

	parts := splitList(raw)
	if len(parts) == 0 {
		return nil, nil
	}

	unique := make(map[int]struct{})
	values := make([]int, 0, len(parts))
	for _, p := range parts {
		num, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("correct answer %q is not a number", p)
		}
		if num <= 0 {
			return nil, fmt.Errorf("correct answer positions must start from 1, got %d", num)
		}
		idx := num - 1
		if idx >= optionCount {
			return nil, fmt.Errorf("correct answer %d exceeds available options (%d)", num, optionCount)
		}
		if _, ok := unique[idx]; !ok {
			unique[idx] = struct{}{}
			values = append(values, idx)
		}
	}

	sort.Ints(values)
	return values, nil
}

func parseWeight(raw string) float64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 1
	}
	val, err := strconv.ParseFloat(raw, 64)
	if err != nil || val <= 0 {
		return 1
	}
	return val
}

func normalizeCSVQuestionType(raw string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "single":
		return "single", nil
	case "multi", "multiple", "multiple_choice":
		return "multi", nil
	case "text":
		return "text", nil
	case "code":
		return "code", nil
	default:
		return "", fmt.Errorf("unsupported question_type '%s' (use single, multi, text or code)", raw)
	}
}
