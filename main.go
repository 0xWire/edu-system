package main

import (
	"edu-system/internal/auth"
	"edu-system/internal/platform"
	"edu-system/internal/platform/authrepo"
	"edu-system/internal/platform/http"
	"edu-system/internal/platform/testrepo"
	"edu-system/internal/test"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := platform.Load()
	db := platform.InitDB(cfg.DBPath)

	// Initialize repositories
	userRepo := authrepo.NewUserRepository(db)
	testRepo := testrepo.NewTestRepository(db)

	// Initialize services
	authService := auth.NewAuthService(userRepo, cfg.JWTSecret)
	testService := test.NewTestService(testRepo)

	// Initialize handlers
	authHandler := auth.NewAuthHandler(authService)
	testHandler := test.NewTestHandler(testService)

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
	engine.Use(platform.CORS())

	// Create JWT middleware
	jwtMW := platform.JWTAuth(cfg.JWTSecret)

	// Mount all routes using feature-based routing
	response.MountV1(engine,
		func(v1 gin.IRouter) { auth.RegisterRoutes(v1, authHandler, jwtMW) },
		func(v1 gin.IRouter) { test.RegisterRoutes(v1, testHandler, jwtMW) },
	)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := engine.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
