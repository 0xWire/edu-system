package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		method := c.Request.Method
		path := c.Request.URL.Path

		log.Printf("CORS middleware: %s %s from origin: %s", method, path, origin)

		// Set CORS headers for all requests
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		} else {
			c.Header("Access-Control-Allow-Origin", "*")
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		// Handle preflight OPTIONS request
		if method == "OPTIONS" {
			log.Printf("Handling OPTIONS preflight for %s", path)
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		log.Printf("Continuing with %s request to %s", method, path)
		c.Next()
	}
}
