package test

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes registers all test-related routes
func RegisterRoutes(v1 gin.IRouter, h *TestHandler, jwtAuth gin.HandlerFunc) {
	protected := v1.Group("/tests")
	protected.Use(jwtAuth)
	{
		protected.GET("", h.GetAllTests)
		protected.GET("/:id", h.GetTest)
		protected.POST("", h.CreateTest)
		protected.PUT("/:id", h.UpdateTest)
		protected.DELETE("/:id", h.DeleteTest)
	}
}
