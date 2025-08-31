package test

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes registers all test-related routes
func RegisterRoutes(v1 gin.IRouter, h *TestHandler, jwtAuth gin.HandlerFunc) {
	// Public test routes (no authentication required)
	v1.GET("/tests", h.GetAllTests)
	v1.GET("/tests/:id", h.GetTest)

	// Protected test routes (require authentication)
	protected := v1.Group("/tests")
	protected.Use(jwtAuth)
	{
		protected.POST("/", h.CreateTest)
		protected.PUT("/:id", h.UpdateTest)
		protected.DELETE("/:id", h.DeleteTest)
	}
}
