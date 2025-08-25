package main

import (
	"edu-system/internal/config"
	"edu-system/internal/database"
	"edu-system/internal/handlers"
	"edu-system/internal/middleware"
	"edu-system/internal/repository"
	"edu-system/internal/routes"
	"edu-system/internal/service"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	db := database.InitDB(cfg.DBPath)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	testRepo := repository.NewTestRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	testService := service.NewTestService(testRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	testHandler := handlers.NewTestHandler(testService)

	gin.SetMode(cfg.GinMode)
	engine := gin.Default()

	// Add request logging middleware
	engine.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[%s] %s %s %d %s %s\n",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"),
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
			param.ClientIP,
		)
	}))

	// Add CORS middleware first, before any routes
	engine.Use(middleware.CORS())

	router := routes.NewRouter(authHandler, testHandler, cfg.JWTSecret)
	router.SetupRoutes(engine)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := engine.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
