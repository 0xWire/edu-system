package assignment

import "github.com/gin-gonic/gin"

func RegisterRoutes(v1 gin.IRouter, h *Handlers, auth gin.HandlerFunc, optionalAuth gin.HandlerFunc) {
	secured := v1.Group("/assignments")
	if auth != nil {
		secured.Use(auth)
	}
	{
		secured.POST("", h.Create)
		secured.GET("", h.ListMine)
	}

	public := v1.Group("/assignments")
	if optionalAuth != nil {
		public.Use(optionalAuth)
	}
	public.GET("/:id", h.Get)
}
