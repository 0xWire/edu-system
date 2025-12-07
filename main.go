package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"edu-system/internal/assignment"
	"edu-system/internal/auth"
	"edu-system/internal/delivery"
	"edu-system/internal/delivery/middleware"
	"edu-system/internal/platform"
	"edu-system/internal/platform/assignmentrepo"
	"edu-system/internal/platform/authrepo"
	"edu-system/internal/platform/testattemptrepo"
	"edu-system/internal/platform/testrepo"
	"edu-system/internal/test"
	"edu-system/internal/testAttempt"
)

func main() {
	cfg := platform.Load()
	db := platform.InitDB(cfg)

	// Initialize repositories
	userRepo := authrepo.NewUserRepository(db)
	testRepo := testrepo.NewTestRepository(db)
	testAttemptRepo := testattemptrepo.NewTestAttemptRepository(db)
	assignmentRepo := assignmentrepo.NewRepository(db)

	// Initialize services
	authService := auth.NewAuthService(userRepo, cfg.JWTSecret)
	testService := test.NewTestService(testRepo)
	assignmentService := assignment.NewService(assignmentRepo, testRepo)
	testAttemptService := testAttempt.NewTestAttemptService(
		testAttemptRepo,
		testRepo,
		assignment.NewReadModel(assignmentService),
		platform.GormTransactor{DB: db},
		platform.SystemClock{},
		platform.AllowGuestsAndOwnerPolicy{Tests: testRepo},
		platform.GormUserDirectory{DB: db},
	)

	// Initialize handlers
	authHandler := auth.NewAuthHandler(authService)
	testHandler := test.NewTestHandler(testService)
	testAttemptHandler := testAttempt.NewHandlers(testAttemptService)
	assignmentHandler := assignment.NewHandlers(assignmentService)

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
		func(v1 gin.IRouter) { assignment.RegisterRoutes(v1, assignmentHandler, jwtMW, optionalJWTMW) },
		func(v1 gin.IRouter) { testAttempt.RegisterRoutes(v1, testAttemptHandler, optionalJWTMW, jwtMW) },
	)

	// Start server
	if err := server.Run(cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
