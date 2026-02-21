package ai

import (
	"errors"
	"net/http"
	"strconv"

	"edu-system/internal/ai/dto"
	response "edu-system/internal/delivery"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RunPipeline(c *gin.Context) {
	var req dto.PipelineRunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "validation error",
			Message: err.Error(),
		})
		return
	}

	userID, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	result, err := h.service.RunPipeline(c.Request.Context(), uint(userID), &req)
	if err != nil {
		status := http.StatusInternalServerError
		switch {
		case errors.Is(err, ErrUnsupportedProvider), errors.Is(err, ErrInvalidLayer):
			status = http.StatusBadRequest
		case errors.Is(err, ErrNoProviderConfigured):
			status = http.StatusServiceUnavailable
		case errors.Is(err, ErrLayerFailed):
			status = http.StatusBadGateway
		}

		c.JSON(status, response.ErrorResponse{
			Error:   "ai pipeline failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *Handler) ListProviders(c *gin.Context) {
	c.JSON(http.StatusOK, h.service.ProviderStatuses())
}

func userIDFromCtx(c *gin.Context) (uint64, bool) {
	val, ok := c.Get("user_id")
	if !ok {
		return 0, false
	}
	switch v := val.(type) {
	case uint64:
		return v, true
	case uint:
		return uint64(v), true
	case int:
		return uint64(v), true
	case float64:
		return uint64(v), true
	case string:
		if parsed, err := strconv.ParseUint(v, 10, 64); err == nil {
			return parsed, true
		}
	}
	return 0, false
}
