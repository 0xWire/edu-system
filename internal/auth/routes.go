package auth

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(v1 gin.IRouter, h *AuthHandler, jwtAuth gin.HandlerFunc) {
	auth := v1.Group("/auth")
	{
		// Public auth routes
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)

		// Protected auth routes
		protected := auth.Group("")
		protected.Use(jwtAuth)
		{
			protected.GET("/profile", h.Profile)
		}
	}
}
