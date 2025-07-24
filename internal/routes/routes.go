package routes

import (
	"edu-system/internal/handlers"
	"edu-system/internal/middleware"

	"github.com/gin-gonic/gin"
)

type Router struct {
	authHandler *handlers.AuthHandler
	jwtSecret   string
}

func NewRouter(authHandler *handlers.AuthHandler, jwtSecret string) *Router {
	return &Router{
		authHandler: authHandler,
		jwtSecret:   jwtSecret,
	}
}

func (r *Router) SetupRoutes(engine *gin.Engine) {
	// Health check endpoint
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
