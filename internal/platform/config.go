package platform

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBPath    string
	JWTSecret string
	GinMode   string
	Port      string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	return &Config{
		DBPath:    getEnv("DB_PATH", "./database.db"),
		JWTSecret: getEnv("JWT_SECRET", "your-secret-key"),
		GinMode:   getEnv("GIN_MODE", "debug"),
		Port:      getEnv("PORT", "8080"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
