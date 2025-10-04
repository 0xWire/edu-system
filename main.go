package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"edu-system/internal/auth"
	"edu-system/internal/delivery"
	"edu-system/internal/delivery/middleware"
	"edu-system/internal/platform"
	"edu-system/internal/platform/authrepo"
	"edu-system/internal/platform/testattemptrepo"
	"edu-system/internal/platform/testrepo"
	"edu-system/internal/test"
	"edu-system/internal/testAttempt"
)

func main() {
	cfg := platform.Load()
	db := platform.InitDB(cfg.DBPath)

	// Initialize repositories
	userRepo := authrepo.NewUserRepository(db)
	testRepo := testrepo.NewTestRepository(db)
	testAttemptRepo := testattemptrepo.NewTestAttemptRepository(db)

	// Initialize services
	authService := auth.NewAuthService(userRepo, cfg.JWTSecret)
	testService := test.NewTestService(testRepo)
	testAttemptService := testAttempt.NewTestAttemptService(
		testAttemptRepo,
		testRepo,
		platform.GormTransactor{DB: db},
		platform.SystemClock{},
		platform.AllowGuestsAndOwnerPolicy{Tests: testRepo},
	)

	// Initialize handlers
	authHandler := auth.NewAuthHandler(authService)
	testHandler := test.NewTestHandler(testService)
	testAttemptHandler := testAttempt.NewHandlers(testAttemptService)

	// Set gin mode
	gin.SetMode(cfg.GinMode)

	// Create server instance
	server := response.NewServer()

	// Create JWT middleware
	jwtMW := middleware.JWTAuth(cfg.JWTSecret)
	optionalJWTMW := middleware.OptionalJWTAuth(cfg.JWTSecret)

	// Create CORS middleware
	cors := middleware.CORS()

	// Setup middleware
	server.SetupMiddleware(cors)

	// Setup routes with feature-based routing
	server.SetupRoutes(
		func(v1 gin.IRouter) { auth.RegisterRoutes(v1, authHandler, jwtMW) },
		func(v1 gin.IRouter) { test.RegisterRoutes(v1, testHandler, jwtMW) },
		func(v1 gin.IRouter) { testAttempt.RegisterRoutes(v1, testAttemptHandler, optionalJWTMW) },
	)

	// Start server
	if err := server.Run(cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
