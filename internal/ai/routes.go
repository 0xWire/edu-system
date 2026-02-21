package ai

import "github.com/gin-gonic/gin"

func RegisterRoutes(v1 gin.IRouter, h *Handler, jwtAuth gin.HandlerFunc) {
	protected := v1.Group("/ai")
	protected.Use(jwtAuth)
	{
		protected.GET("/providers", h.ListProviders)
		protected.POST("/pipeline", h.RunPipeline)
	}
}
