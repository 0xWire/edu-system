package middleware

import (
	"log"
	"net/http"
	"strings"

	"edu-system/internal/delivery"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func OptionalJWTAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid authorization header format",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			log.Printf("Optional JWT Auth: token validation failed: %v", err)
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token",
			})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token claims",
			})
			c.Abort()
			return
		}

		userID, hasUserID := claims["user_id"]
		email, hasEmail := claims["email"]
		role, hasRole := claims["role"]
		if !hasUserID || !hasEmail || !hasRole {
			c.JSON(http.StatusUnauthorized, response.ErrorResponse{
				Error: "invalid token claims",
			})
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		c.Set("email", email)
		c.Set("role", role)

		c.Next()
	}
}
