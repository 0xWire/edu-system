package test

import (
	"edu-system/internal/delivery"
	"edu-system/internal/test/dto"
	"github.com/gin-gonic/gin"
	"net/http"
)

type TestHandler struct {
	testService TestService
}

func NewTestHandler(testService TestService) *TestHandler {
	return &TestHandler{
		testService: testService,
	}
}

func (h *TestHandler) CreateTest(c *gin.Context) {
	var req dto.CreateTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "validation error",
			Message: err.Error(),
		})
		return
	}

	if err := h.testService.CreateTest(&req); err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{
			Error:   "test creation failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, response.SuccessResponse{
		Message: "test created successfully",
	})
}

func (h *TestHandler) GetTest(c *gin.Context) {
	testID := c.Param("id")
	if testID == "" {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "validation error",
			Message: "test ID is required",
		})
		return
	}

	test, err := h.testService.GetTest(testID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{
			Error:   "test retrieval failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, test)
}

func (h *TestHandler) GetAllTests(c *gin.Context) {
	tests, err := h.testService.GetAllTests()
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{
			Error:   "failed to retrieve tests",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, tests)
}

func (h *TestHandler) UpdateTest(c *gin.Context) {
	testID := c.Param("id")
	if testID == "" {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "validation error",
			Message: "test ID is required",
		})
		return
	}

	var req dto.UpdateTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "validation error",
			Message: err.Error(),
		})
		return
	}

	req.TestID = testID

	if err := h.testService.UpdateTest(testID, &req); err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{
			Error:   "test update failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response.SuccessResponse{
		Message: "test updated successfully",
	})
}

func (h *TestHandler) DeleteTest(c *gin.Context) {
	testID := c.Param("id")
	if testID == "" {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "validation error",
			Message: "test ID is required",
		})
		return
	}

	if err := h.testService.DeleteTest(testID); err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{
			Error:   "test deletion failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response.SuccessResponse{
		Message: "test deleted successfully",
	})
}
