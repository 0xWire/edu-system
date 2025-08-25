package routes

import (
	"edu-system/internal/handlers"
	"edu-system/internal/middleware"
	"log"

	"github.com/gin-gonic/gin"
)

type Router struct {
	authHandler *handlers.AuthHandler
	testHandler *handlers.TestHandler
	jwtSecret   string
}

func NewRouter(authHandler *handlers.AuthHandler, testHandler *handlers.TestHandler, jwtSecret string) *Router {
	return &Router{
		authHandler: authHandler,
		testHandler: testHandler,
		jwtSecret:   jwtSecret,
	}
}

func (r *Router) SetupRoutes(engine *gin.Engine) {
	// Disable trailing slash redirects
	engine.RedirectTrailingSlash = false

	engine.GET("/health", func(c *gin.Context) {
		log.Println("Health check endpoint called")
		c.JSON(200, gin.H{"status": "ok", "message": "Server is running"})
	})

	// Debug endpoint
	engine.GET("/debug", func(c *gin.Context) {
		log.Println("Debug endpoint called")
		c.JSON(200, gin.H{
			"message": "Debug endpoint working",
			"headers": c.Request.Header,
			"method":  c.Request.Method,
			"path":    c.Request.URL.Path,
		})
	})

	// API v1 group
	v1 := engine.Group("/api/v1")
	{
		// Public endpoints (no auth required)
		v1.GET("/tests/public", func(c *gin.Context) {
			log.Println("Public tests endpoint called")
			c.JSON(200, gin.H{
				"message": "Public tests endpoint working",
				"method":  c.Request.Method,
				"path":    c.Request.URL.Path,
			})
		})

		// Public test routes (for testing/debugging)
		v1.GET("/tests", r.testHandler.GetAllTests)
		v1.GET("/tests/:id", r.testHandler.GetTest)

		// Auth routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", r.authHandler.Register)
			auth.POST("/login", r.authHandler.Login)

			// Protected routes
			protected := auth.Group("")
			protected.Use(middleware.JWTAuth(r.jwtSecret))
			{
				protected.GET("/profile", r.authHandler.Profile)
			}
		}

		// Protected routes that require authentication
		protected := v1.Group("")
		protected.Use(middleware.JWTAuth(r.jwtSecret))
		{
			// Test management routes (create, update, delete require auth)
			tests := protected.Group("/tests")
			{
				tests.POST("/", r.testHandler.CreateTest)
				tests.PUT("/:id", r.testHandler.UpdateTest)
				tests.DELETE("/:id", r.testHandler.DeleteTest)
			}
		}
	}
}
