package middleware

import (
	"edu-system/internal/dto"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func JWTAuth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Error: "authorization header required",
			})
			c.Abort()
			return
		}

		// Перевіряємо формат Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Error: "invalid authorization header format",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Парсимо та перевіряємо токен
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Error: "invalid token",
			})
			c.Abort()
			return
		}

		if !token.Valid {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Error: "token is not valid",
			})
			c.Abort()
			return
		}

		// Додаємо claims до контексту
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("user_id", claims["user_id"])
			c.Set("email", claims["email"])
			c.Set("role", claims["role"])
		}

		c.Next()
	}
}

func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusUnauthorized, dto.ErrorResponse{
				Error: "user role not found",
			})
			c.Abort()
			return
		}

		if userRole.(string) != role {
			c.JSON(http.StatusForbidden, dto.ErrorResponse{
				Error: "insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
