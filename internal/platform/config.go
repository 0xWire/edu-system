package platform

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DBPath    string
	DBDriver  string
	DBDSN     string
	JWTSecret string
	GinMode   string
	Port      string

	AIProviderOrder  []string
	AIHTTPTimeoutSec int

	OpenAIAPIKey  string
	OpenAIBaseURL string
	OpenAIModel   string

	GeminiAPIKey  string
	GeminiBaseURL string
	GeminiModel   string

	DeepSeekAPIKey  string
	DeepSeekBaseURL string
	DeepSeekModel   string

	OpenRouterAPIKey  string
	OpenRouterBaseURL string
	OpenRouterModel   string

	LocalAIAPIKey  string
	LocalAIBaseURL string
	LocalAIModel   string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	return &Config{
		DBPath:    getEnv("DB_PATH", "./database.db"),
		DBDriver:  getEnv("DB_DRIVER", "sqlite"),
		DBDSN:     getEnv("DB_DSN", ""),
		JWTSecret: getEnv("JWT_SECRET", "your-secret-key"),
		GinMode:   getEnv("GIN_MODE", "debug"),
		Port:      getEnv("PORT", "8080"),

		AIProviderOrder:  splitAndTrim(getEnv("AI_PROVIDER_ORDER", "openai,gemini,deepseek,openrouter,local")),
		AIHTTPTimeoutSec: getEnvInt("AI_HTTP_TIMEOUT_SEC", 90),

		OpenAIAPIKey:  getEnv("OPENAI_API_KEY", ""),
		OpenAIBaseURL: getEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
		OpenAIModel:   getEnv("OPENAI_MODEL", "gpt-4o-mini"),

		GeminiAPIKey:  getEnv("GEMINI_API_KEY", ""),
		GeminiBaseURL: getEnv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com"),
		GeminiModel:   getEnv("GEMINI_MODEL", "gemini-2.0-flash"),

		DeepSeekAPIKey:  getEnv("DEEPSEEK_API_KEY", ""),
		DeepSeekBaseURL: getEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
		DeepSeekModel:   getEnv("DEEPSEEK_MODEL", "deepseek-chat"),

		OpenRouterAPIKey:  getEnv("OPENROUTER_API_KEY", ""),
		OpenRouterBaseURL: getEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
		OpenRouterModel:   getEnv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),

		LocalAIAPIKey:  getEnv("LOCAL_AI_API_KEY", ""),
		LocalAIBaseURL: getEnv("LOCAL_AI_BASE_URL", "http://localhost:11434/v1"),
		LocalAIModel:   getEnv("LOCAL_AI_MODEL", "llama3.1:8b-instruct"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return defaultValue
	}
	return value
}

func splitAndTrim(input string) []string {
	if strings.TrimSpace(input) == "" {
		return nil
	}

	parts := strings.Split(input, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		result = append(result, value)
	}
	return result
}
