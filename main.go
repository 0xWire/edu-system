package main

import (
	"edu-system/internal/config"
	"edu-system/internal/database"
	"edu-system/internal/handlers"
	"edu-system/internal/repository"
	"edu-system/internal/routes"
	"edu-system/internal/service"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	db := database.InitDB(cfg.DBPath)

	userRepo := repository.NewUserRepository(db)

	authService := service.NewAuthService(userRepo, cfg.JWTSecret)

	authHandler := handlers.NewAuthHandler(authService)

	gin.SetMode(cfg.GinMode)
	engine := gin.Default()

	engine.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	router := routes.NewRouter(authHandler, cfg.JWTSecret)
	router.SetupRoutes(engine)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := engine.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
