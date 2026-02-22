// Package main creates a standalone demo database at ./demo/demo.db populated
// with realistic seed data for presentations (dashboard, assignments, results).
//
// Usage:
//
//	go run ./cmd/seed
//	make seed
//
// The main application database is never touched.
package main

import (
	"fmt"
	"log"
	"math/rand"
	"os"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const (
	demoDir    = "demo"
	demoDBPath = "demo/demo.db"
)

func main() {
	// Always write to a separate demo directory — never touch the main database.
	must(os.MkdirAll(demoDir, 0o755))

	// Remove existing demo DB so every seed run is clean and reproducible.
	if err := os.Remove(demoDBPath); err != nil && !os.IsNotExist(err) {
		log.Fatalf("failed to remove old demo db: %v", err)
	}

	log.Printf("Creating demo database: %s", demoDBPath)
	db, err := gorm.Open(sqlite.Open(demoDBPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	must(err)

	log.Println("Running migrations...")
	must(db.AutoMigrate(
		&userRow{},
		&testRow{},
		&questionRow{},
		&optionRow{},
		&assignmentRow{},
		&attemptRow{},
		&answerRow{},
	))

	rng := rand.New(rand.NewSource(42))

	teacher := createTeacher(db)
	log.Printf("Teacher: %s (id=%d)", teacher.Email, teacher.ID)

	studentUsers := createStudents(db)
	log.Printf("Created %d student users", len(studentUsers))

	testIDs := createTests(db, teacher)
	log.Printf("Created %d tests", len(testIDs))

	assignIDs := createAssignments(db, teacher, testIDs)
	log.Printf("Created %d assignments", len(assignIDs))

	total := createAttempts(db, testIDs, assignIDs, studentUsers, rng)
	log.Printf("Created %d attempts with answers", total)

	fmt.Println()
	fmt.Println("=========================================")
	fmt.Println("  Seed completed successfully!")
	fmt.Println("=========================================")
	fmt.Printf("  Demo DB        : %s\n", demoDBPath)
	fmt.Printf("  Teacher login  : demo@edu.kz\n")
	fmt.Printf("  Password       : Demo1234!\n")
	fmt.Println()
	fmt.Println("  To run the app with demo data:")
	fmt.Printf("  DB_PATH=%s make run\n", demoDBPath)
	fmt.Println("  or just: make run-demo")
	fmt.Println("=========================================")
}
