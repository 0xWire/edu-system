package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func must(err error) {
	if err != nil {
		log.Fatalf("seed error: %v", err)
	}
}

func hashPassword(pw string) string {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	must(err)
	return string(b)
}

func newID() string { return uuid.New().String() }

func randomIP(rng *rand.Rand) string {
	return fmt.Sprintf("10.%d.%d.%d", rng.Intn(5)+1, rng.Intn(254)+1, rng.Intn(254)+1)
}

func imax(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func sameSet(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	m := make(map[int]bool, len(b))
	for _, v := range b {
		m[v] = true
	}
	for _, v := range a {
		if !m[v] {
			return false
		}
	}
	return true
}

// ---------------------------------------------------------------------------
// User creation
// ---------------------------------------------------------------------------

func createTeacher(db *gorm.DB) userRow {
	teacher := userRow{
		Email:     "demo@edu.kz",
		Password:  hashPassword("Demo1234!"),
		FirstName: "Aidana",
		LastName:  "Seitkali",
		Role:      "user",
	}
	must(db.Where("email = ?", teacher.Email).FirstOrCreate(&teacher).Error)
	return teacher
}

func createStudents(db *gorm.DB) []userRow {
	out := make([]userRow, 0, len(students))
	for _, s := range students {
		row := userRow{
			Email:     s.email,
			Password:  hashPassword("Student123!"),
			FirstName: s.firstName,
			LastName:  s.lastName,
			Role:      "user",
		}
		db.Where("email = ?", row.Email).FirstOrCreate(&row)
		out = append(out, row)
	}
	return out
}

// ---------------------------------------------------------------------------
// Test & question creation
// ---------------------------------------------------------------------------

func createTests(db *gorm.DB, teacher userRow) []string {
	ids := make([]string, 0, len(seedTests))
	now := time.Now()

	for i, st := range seedTests {
		testID := newID()
		created := now.Add(-time.Duration(len(seedTests)-i) * 7 * 24 * time.Hour)

		must(db.Create(&testRow{
			ID:            testID,
			AuthorID:      teacher.ID,
			Author:        teacher.FirstName + " " + teacher.LastName,
			CreatedAt:     created,
			UpdatedAt:     created,
			Title:         st.title,
			Description:   st.description,
			DurationSec:   st.durationSec,
			AllowGuests:   st.allowGuests,
			AttemptPolicy: st.policy,
		}).Error)

		for qi, sq := range st.questions {
			qid := newID()
			qCreated := created.Add(time.Duration(qi) * time.Minute)

			correctJSON := []byte("null")
			if sq.qtype == "multi" {
				correctJSON, _ = json.Marshal(sq.corrMulti)
			}

			must(db.Create(&questionRow{
				ID:            qid,
				CreatedAt:     qCreated,
				UpdatedAt:     qCreated,
				TestID:        testID,
				QuestionText:  sq.text,
				Type:          sq.qtype,
				CorrectOption: sq.correct,
				CorrectJSON:   correctJSON,
				Weight:        sq.weight,
			}).Error)

			for oi, opt := range sq.options {
				oCreated := qCreated.Add(time.Duration(oi) * time.Second)
				must(db.Create(&optionRow{
					ID:         newID(),
					CreatedAt:  oCreated,
					UpdatedAt:  oCreated,
					QuestionID: qid,
					OptionText: opt,
				}).Error)
			}
		}

		ids = append(ids, testID)
		log.Printf("  Created test #%d: %s (%d questions)", i+1, st.title, len(st.questions))
	}
	return ids
}

// ---------------------------------------------------------------------------
// Assignment creation
// ---------------------------------------------------------------------------

func createAssignments(db *gorm.DB, teacher userRow, testIDs []string) []string {
	ids := make([]string, 0, len(testIDs))
	now := time.Now()
	template, _ := json.Marshal(map[string]any{
		"shuffle_questions": true,
		"shuffle_answers":   true,
	})

	for i, testID := range testIDs {
		aID := newID()
		created := now.Add(-time.Duration(len(testIDs)-i) * 5 * 24 * time.Hour)
		must(db.Create(&assignmentRow{
			ID:               aID,
			CreatedAt:        created,
			UpdatedAt:        created,
			TestID:           testID,
			OwnerID:          teacher.ID,
			Title:            assignmentMeta[i].title,
			Comment:          assignmentMeta[i].comment,
			TemplateSnapshot: template,
		}).Error)
		ids = append(ids, aID)
	}
	return ids
}

// ---------------------------------------------------------------------------
// Attempt & answer generation
// ---------------------------------------------------------------------------

func createAttempts(db *gorm.DB, testIDs, assignIDs []string, studentUsers []userRow, rng *rand.Rand) int {
	type qmeta struct {
		id        string
		qtype     string
		correct   int
		corrMulti []int
		weight    float64
		optCount  int
	}

	loadQuestions := func(testID string) []qmeta {
		var rows []questionRow
		must(db.Where("test_id = ?", testID).Find(&rows).Error)
		out := make([]qmeta, 0, len(rows))
		for _, qr := range rows {
			var cnt int64
			db.Model(&optionRow{}).Where("question_id = ?", qr.ID).Count(&cnt)
			var cm []int
			if qr.CorrectJSON != nil && string(qr.CorrectJSON) != "null" {
				json.Unmarshal(qr.CorrectJSON, &cm)
			}
			out = append(out, qmeta{
				id: qr.ID, qtype: qr.Type,
				correct: qr.CorrectOption, corrMulti: cm,
				weight: qr.Weight, optCount: int(cnt),
			})
		}
		return out
	}

	// Fixed per-student accuracy so results are reproducible
	profiles := make([]float64, len(studentUsers))
	for i := range profiles {
		profiles[i] = 0.45 + rng.Float64()*0.55
	}

	total := 0
	now := time.Now()

	for ti, testID := range testIDs {
		assignID := assignIDs[ti]
		questions := loadQuestions(testID)

		participantCount := 6 + rng.Intn(len(studentUsers)-5)
		shuffled := rng.Perm(len(studentUsers))

		for pi := 0; pi < participantCount; pi++ {
			si := shuffled[pi]
			student := studentUsers[si]
			accuracy := profiles[si]

			daysAgo := rng.Intn(20) + 1
			startedAt := now.Add(-time.Duration(daysAgo)*24*time.Hour - time.Duration(rng.Intn(8))*time.Hour)
			durSec := seedTests[ti].durationSec
			if durSec == 0 {
				durSec = 1800
			}
			takenSec := int(float64(durSec) * (0.5 + rng.Float64()*0.5))
			submittedAt := startedAt.Add(time.Duration(takenSec) * time.Second)

			orderIDs := make([]string, len(questions))
			maxScore := 0.0
			for i, q := range questions {
				orderIDs[i] = q.id
				maxScore += q.weight
			}

			orderJSON, _ := json.Marshal(orderIDs)
			policyJSON, _ := json.Marshal(map[string]any{
				"shuffle_questions": true,
				"shuffle_answers":   true,
				"reveal_score_mode": "after_submit",
			})
			fields, _ := json.Marshal(map[string]string{})
			attemptID := newID()

			score := 0.0
			answers := make([]answerRow, 0, len(questions))
			for _, q := range questions {
				ok, payload := generateAnswer(q.qtype, q.correct, q.corrMulti, q.optCount, accuracy, rng)
				sc := 0.0
				if ok {
					sc = q.weight
					score += q.weight
				}
				answers = append(answers, answerRow{
					ID:         newID(),
					CreatedAt:  startedAt,
					UpdatedAt:  submittedAt,
					AttemptID:  attemptID,
					QuestionID: q.id,
					Payload:    payload,
					IsCorrect:  &ok,
					Score:      &sc,
				})
			}

			must(db.Create(&attemptRow{
				ID:                    attemptID,
				CreatedAt:             startedAt,
				UpdatedAt:             submittedAt,
				AssignmentID:          assignID,
				TestID:                testID,
				UserID:                uint64(student.ID),
				ParticipantFieldsJSON: fields,
				StartedAt:             startedAt,
				SubmittedAt:           &submittedAt,
				Status:                "submitted",
				DurationSec:           takenSec,
				Version:               1,
				Seed:                  rng.Int63(),
				Score:                 score,
				MaxScore:              maxScore,
				ClientIP:              randomIP(rng),
				ClientFingerprint:     uuid.New().String()[:32],
				PolicyJSON:            policyJSON,
				OrderJSON:             orderJSON,
				Cursor:                len(questions),
			}).Error)

			for _, ar := range answers {
				must(db.Create(&ar).Error)
			}
			total++
		}
	}
	return total
}

// generateAnswer produces a realistic answer payload based on student accuracy.
func generateAnswer(qtype string, correct int, corrMulti []int, optCount int, accuracy float64, rng *rand.Rand) (bool, json.RawMessage) {
	isCorrect := rng.Float64() < accuracy

	switch qtype {
	case "single":
		chosen := correct
		if !isCorrect && optCount > 1 {
			for chosen == correct {
				chosen = rng.Intn(optCount)
			}
		}
		payload, _ := json.Marshal(map[string]any{"kind": 0, "single": chosen})
		return chosen == correct, payload

	case "multi":
		var chosen []int
		if isCorrect {
			chosen = corrMulti
		} else {
			all := make([]int, optCount)
			for i := range all {
				all[i] = i
			}
			rng.Shuffle(len(all), func(a, b int) { all[a], all[b] = all[b], all[a] })
			n := 1 + rng.Intn(imax(1, optCount-1))
			chosen = all[:n]
			isCorrect = sameSet(chosen, corrMulti)
		}
		payload, _ := json.Marshal(map[string]any{"kind": 1, "multi": chosen})
		return isCorrect, payload

	default:
		payload, _ := json.Marshal(map[string]any{"kind": 0, "single": 0})
		return false, payload
	}
}
