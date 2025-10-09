package assignment

import "github.com/gin-gonic/gin"

func RegisterRoutes(v1 gin.IRouter, h *Handlers, auth gin.HandlerFunc) {
	secured := v1.Group("/assignments")
	secured.Use(auth)
	{
		secured.POST("", h.Create)
		secured.GET("", h.ListMine)
	}

	v1.GET("/assignments/:id", h.Get)
}
