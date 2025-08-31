package response

import (
	"log"

	"github.com/gin-gonic/gin"
)

func MountV1(r *gin.Engine, mounts ...func(gin.IRouter)) {
	r.RedirectTrailingSlash = false

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		log.Println("Health check endpoint called")
		c.JSON(200, gin.H{"status": "ok", "message": "Server is running"})
	})

	// Debug endpoint
	r.GET("/debug", func(c *gin.Context) {
		log.Println("Debug endpoint called")
		c.JSON(200, gin.H{
			"message": "Debug endpoint working",
			"headers": c.Request.Header,
			"method":  c.Request.Method,
			"path":    c.Request.URL.Path,
		})
	})

	// API v1 group
	v1 := r.Group("/api/v1")

	// Mount all feature routes
	for _, mount := range mounts {
		mount(v1)
	}
}
