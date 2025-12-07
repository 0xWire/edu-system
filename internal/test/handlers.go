package test

import (
	"net/http"
	"strconv"

	"edu-system/internal/delivery"
	"edu-system/internal/test/dto"
	"github.com/gin-gonic/gin"
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

	uid, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{
			Error: "unauthorized",
		})
		return
	}

	testID, err := h.testService.CreateTest(uint(uid), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{
			Error:   "test creation failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, response.SuccessResponse{
		Message: "test created successfully",
		Data:    gin.H{"test_id": testID},
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

	uid, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	testData, err := h.testService.GetTest(uint(uid), testID)
	if err != nil {
		status := http.StatusInternalServerError
		errMsg := err.Error()
		if err == ErrForbidden {
			status = http.StatusForbidden
			errMsg = "not allowed"
		}
		c.JSON(status, response.ErrorResponse{
			Error:   "test retrieval failed",
			Message: errMsg,
		})
		return
	}

	c.JSON(http.StatusOK, testData)
}

func (h *TestHandler) GetAllTests(c *gin.Context) {
	uid, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	tests, err := h.testService.ListTests(uint(uid))
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

	uid, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	if err := h.testService.UpdateTest(uint(uid), testID, &req); err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if err == ErrForbidden {
			status = http.StatusForbidden
			msg = "not allowed"
		}
		c.JSON(status, response.ErrorResponse{
			Error:   "test update failed",
			Message: msg,
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

	uid, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	if err := h.testService.DeleteTest(uint(uid), testID); err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if err == ErrForbidden {
			status = http.StatusForbidden
			msg = "not allowed"
		}
		c.JSON(status, response.ErrorResponse{
			Error:   "test deletion failed",
			Message: msg,
		})
		return
	}

	c.JSON(http.StatusOK, response.SuccessResponse{
		Message: "test deleted successfully",
	})
}

func (h *TestHandler) DownloadCSVTemplate(c *gin.Context) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=test-template.csv")
	c.String(http.StatusOK, csvTemplateContent())
}

func (h *TestHandler) ImportFromCSV(c *gin.Context) {
	uid, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "file is required",
			Message: err.Error(),
		})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "failed to read file",
			Message: err.Error(),
		})
		return
	}
	defer src.Close()

	author := authorFromCtx(c)
	result, err := h.testService.ImportTestFromCSV(uint(uid), author, src)
	if err != nil {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{
			Error:   "test import failed",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, response.SuccessResponse{
		Message: "test imported successfully",
		Data:    result,
	})
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

func authorFromCtx(c *gin.Context) string {
	if email, ok := c.Get("email"); ok {
		if s, ok := email.(string); ok && s != "" {
			return s
		}
	}
	return "Imported via CSV"
}
