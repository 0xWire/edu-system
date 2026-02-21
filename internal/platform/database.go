package platform

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"edu-system/internal/auth"
	"edu-system/internal/platform/assignmentrepo"
	"edu-system/internal/platform/testattemptrepo"
	"edu-system/internal/test"
)

func InitDB(cfg *Config) *gorm.DB {
	var (
		db  *gorm.DB
		err error
	)

	switch cfg.DBDriver {
	case "postgres", "postgresql":
		if cfg.DBDSN == "" {
			log.Fatalf("DB_DSN is required when DB_DRIVER is %s", cfg.DBDriver)
		}
		db, err = gorm.Open(postgres.Open(cfg.DBDSN), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
	default:
		if err := ensureSQLiteDBPath(cfg.DBPath); err != nil {
			log.Fatalf("Failed to prepare SQLite path %q: %v", cfg.DBPath, err)
		}
		db, err = gorm.Open(sqlite.Open(cfg.DBPath), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
	}
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

func ensureSQLiteDBPath(dbPath string) error {
	path := strings.TrimSpace(dbPath)
	if path == "" {
		return fmt.Errorf("DB_PATH cannot be empty")
	}

	dir := filepath.Dir(path)
	if dir == "." || dir == "" {
		return nil
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	return nil
}
