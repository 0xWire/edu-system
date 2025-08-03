package handlers

import (
	"edu-system/internal/dto"
	"edu-system/internal/service"
	"github.com/gin-gonic/gin"
	"net/http"
)

type TestHandler struct {
	testService service.TestService
}

func NewTestHandler(testService service.TestService) *TestHandler {
	return &TestHandler{
		testService: testService,
	}
}

func (h *TestHandler) CreateTest(c *gin.Context) {
	var req dto.CreateTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Error:   "validation error",
			Message: err.Error(),
		})
		return
	}

	if err := h.testService.CreateTest(&req); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Error:   "test creation failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "test created successfully",
	})
}

func (h *TestHandler) GetTest(c *gin.Context) {
	testID := c.Param("id")
	if testID == "" {
		c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Error:   "validation error",
			Message: "test ID is required",
		})
		return
	}

	test, err := h.testService.GetTest(testID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResponse{
			Error:   "test retrieval failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, test)
}
