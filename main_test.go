package main

import (
	"bytes"
	"edu-system/internal/config"
	"edu-system/internal/database"
	"edu-system/internal/handlers"
	"edu-system/internal/repository"
	"edu-system/internal/routes"
	"edu-system/internal/service"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupTestApp() *gin.Engine {
	os.Setenv("DB_PATH", ":memory:")
	os.Setenv("JWT_SECRET", "test-secret")

	cfg := config.Load()
	db := database.InitDB(cfg.DBPath)

	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	authHandler := handlers.NewAuthHandler(authService)

	gin.SetMode(gin.TestMode)
	engine := gin.New()

	router := routes.NewRouter(authHandler, cfg.JWTSecret)
	router.SetupRoutes(engine)

	return engine
}

func TestHealthCheck(t *testing.T) {
	app := setupTestApp()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	app.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), "ok")
}

func TestUserRegistration(t *testing.T) {
	app := setupTestApp()

	registerData := map[string]string{
		"email":      "test@example.com",
		"password":   "123456",
		"first_name": "Test",
		"last_name":  "User",
	}

	jsonData, _ := json.Marshal(registerData)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	app.ServeHTTP(w, req)

	assert.Equal(t, 201, w.Code)
	assert.Contains(t, w.Body.String(), "user registered successfully")
}

func TestUserLogin(t *testing.T) {
	app := setupTestApp()

	// Спочатку реєструємо користувача
	registerData := map[string]string{
		"email":      "test@example.com",
		"password":   "123456",
		"first_name": "Test",
		"last_name":  "User",
	}

	jsonData, _ := json.Marshal(registerData)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	app.ServeHTTP(w, req)

	// Тепер тестуємо логін
	loginData := map[string]string{
		"email":    "test@example.com",
		"password": "123456",
	}

	jsonData, _ = json.Marshal(loginData)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	app.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), "token")
}
