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
		protected.GET("/template/csv", h.DownloadCSVTemplate)
		protected.POST("/import", h.ImportFromCSV)
		protected.POST("", h.CreateTest)
		protected.GET("/:id", h.GetTest)
		protected.PUT("/:id", h.UpdateTest)
		protected.DELETE("/:id", h.DeleteTest)
	}
}
