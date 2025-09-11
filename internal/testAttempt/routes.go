package testAttempt

import "github.com/gin-gonic/gin"

func RegisterRoutes(v1 gin.IRouter, h *Handlers, authMW gin.HandlerFunc) {
	grp := v1.Group("/attempts")
	{
		grp.POST("/start", h.Start)
		grp.GET("/:id/question", h.NextQuestion)
		grp.POST("/:id/answer", h.Answer)
		grp.POST("/:id/submit", h.Submit)
		grp.POST("/:id/cancel", h.Cancel)
	}
	_ = authMW
}
