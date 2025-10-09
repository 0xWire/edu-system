package platform

import (
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"edu-system/internal/auth"
	"edu-system/internal/platform/assignmentrepo"
	"edu-system/internal/platform/testattemptrepo"
	"edu-system/internal/test"
)

func InitDB(dbPath string) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(
		&auth.User{},
		&test.Test{},
		&test.Question{},
		&test.Option{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	if err := testattemptrepo.Migrate(db); err != nil {
		log.Fatalf("Failed to migrate test attempt tables: %v", err)
	}

	if err := assignmentrepo.Migrate(db); err != nil {
		log.Fatalf("Failed to migrate assignment tables: %v", err)
	}

	log.Println("Database initialized successfully")
	return db
}
