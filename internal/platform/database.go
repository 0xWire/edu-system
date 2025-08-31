package platform

import (
	"edu-system/internal/auth"
	"edu-system/internal/test"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
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

	log.Println("Database initialized successfully")
	return db
}
