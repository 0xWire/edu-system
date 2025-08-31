package middleware

import (
	"log"
	"net/http"
	"strings"

	"edu-system/internal/delivery"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func JWTAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("JWT Auth middleware: %s %s", c.Request.Method, c.Request.URL.Path)

		// Handle preflight OPTIONS request
		if c.Request.Method == "OPTIONS" {
			log.Println("JWT Auth: Skipping OPTIONS request")
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		log.Printf("JWT Auth: Authorization header = '%s'", authHeader)

		if authHeader == "" {
			log.Println("JWT Auth: No authorization header provided")
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "authorization header required",
			})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			log.Printf("JWT Auth: Invalid authorization header format: %v", parts)
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid authorization header format",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]
		log.Printf("JWT Auth: Token = %s...", tokenString[:min(len(tokenString), 20)])

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			log.Printf("JWT Auth: Token parse error: %v", err)
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token",
			})
			c.Abort()
			return
		}

		if !token.Valid {
			log.Println("JWT Auth: Token is not valid")
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token",
			})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Println("JWT Auth: Cannot parse token claims")
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token claims",
			})
			c.Abort()
			return
		}

		userID, ok := claims["user_id"]
		if !ok {
			log.Println("JWT Auth: No user_id in token claims")
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token claims",
			})
			c.Abort()
			return
		}

		email, ok := claims["email"]
		if !ok {
			log.Println("JWT Auth: No email in token claims")
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token claims",
			})
			c.Abort()
			return
		}

		role, ok := claims["role"]
		if !ok {
			log.Println("JWT Auth: No role in token claims")
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token claims",
			})
			c.Abort()
			return
		}

		log.Printf("JWT Auth: Successfully authenticated user ID: %v, email: %v, role: %v", userID, email, role)

		c.Set("user_id", userID)
		c.Set("email", email)
		c.Set("role", role)

		c.Next()
	}
}

func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "user role not found",
			})
			c.Abort()
			return
		}

		if role.(string) != requiredRole {
			c.JSON(http.StatusForbidden, response.ErrorResponse{
				Error: "insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
