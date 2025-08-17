package routes

import (
	"edu-system/internal/handlers"
	"edu-system/internal/middleware"

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
	engine.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 group
	v1 := engine.Group("/api/v1")
	{
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
			// Test routes
			tests := protected.Group("/tests")
			{
				tests.POST("/", r.testHandler.CreateTest)
				tests.GET("/", r.testHandler.GetAllTests)
				tests.GET("/:id", r.testHandler.GetTest)
				tests.PUT("/:id", r.testHandler.UpdateTest)
				tests.DELETE("/:id", r.testHandler.DeleteTest)
			}

			// User routes
			users := protected.Group("/users")
			{
				users.GET("/", func(c *gin.Context) {
					c.JSON(200, gin.H{"message": "get all users"})
				})
				users.GET("/:id", func(c *gin.Context) {
					c.JSON(200, gin.H{"message": "get user by id"})
				})
			}

			// Admin only routes
			admin := protected.Group("/admin")
			admin.Use(middleware.RequireRole("admin"))
			{
				admin.GET("/dashboard", func(c *gin.Context) {
					c.JSON(200, gin.H{"message": "admin dashboard"})
				})
			}
		}
	}
}
