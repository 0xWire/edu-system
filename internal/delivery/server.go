package response

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

type Server struct {
	engine *gin.Engine
}

func NewServer() *Server {
	engine := gin.Default()
	return &Server{
		engine: engine,
	}
}

func (s *Server) SetupMiddleware(corsMiddleware gin.HandlerFunc) {
	s.engine.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[%s] %s %s %d %s %s\n",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"),
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
			param.ClientIP,
		)
	}))

	s.engine.Use(corsMiddleware)
}

func (s *Server) SetupRoutes(mounts ...func(gin.IRouter)) {
	// Disable trailing slash redirects
	s.engine.RedirectTrailingSlash = false

	// Health check endpoint
	s.engine.GET("/health", func(c *gin.Context) {
		log.Println("Health check endpoint called")
		c.JSON(200, gin.H{"status": "ok", "message": "Server is running"})
	})

	// Debug endpoint
	s.engine.GET("/debug", func(c *gin.Context) {
		log.Println("Debug endpoint called")
		c.JSON(200, gin.H{
			"message": "Debug endpoint working",
			"headers": c.Request.Header,
			"method":  c.Request.Method,
			"path":    c.Request.URL.Path,
		})
	})

	// API v1 group
	v1 := s.engine.Group("/api/v1")

	// Mount all feature routes
	for _, mount := range mounts {
		mount(v1)
	}
}

func (s *Server) Run(port string) error {
	log.Printf("Server starting on port %s", port)
	return s.engine.Run(":" + port)
}

func (s *Server) GetEngine() *gin.Engine {
	return s.engine
}
