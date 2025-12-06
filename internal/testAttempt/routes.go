package testAttempt

import "github.com/gin-gonic/gin"

func RegisterRoutes(v1 gin.IRouter, h *Handlers, optionalAuth gin.HandlerFunc, authRequired gin.HandlerFunc) {
	open := v1.Group("/attempts")
	if optionalAuth != nil {
		open.Use(optionalAuth)
	}
	{
		open.POST("/start", h.Start)
		open.GET("/:id/question", h.NextQuestion)
		open.POST("/:id/answer", h.Answer)
		open.POST("/:id/submit", h.Submit)
		open.POST("/:id/cancel", h.Cancel)
	}

	secured := v1.Group("/attempts")
	if authRequired != nil {
		secured.Use(authRequired)
	}
	{
		secured.GET("", h.ListByAssignment)
		secured.GET("/export", h.Export)
		secured.GET("/:id/details", h.Details)
		secured.POST("/:id/grade", h.Grade)
	}
}
