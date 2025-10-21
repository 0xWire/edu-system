package assignment

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"edu-system/internal/assignment/dto"
	"edu-system/internal/delivery"
)

type Handlers struct {
	svc *Service
}

func NewHandlers(svc *Service) *Handlers {
	return &Handlers{svc: svc}
}

func (h *Handlers) Create(c *gin.Context) {
	var req dto.CreateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{Error: "invalid payload", Message: err.Error()})
		return
	}

	ownerID, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	assignment, err := h.svc.Create(c, uint(ownerID), req.TestID, req.Title)
	if err != nil {
		status := http.StatusInternalServerError
		msg := err.Error()
		if err == ErrForbidden {
			status = http.StatusForbidden
			msg = "not allowed"
		}
		c.JSON(status, response.ErrorResponse{Error: "assignment_create_failed", Message: msg})
		return
	}

	c.JSON(http.StatusCreated, toView(*assignment, nil, true))
}

func (h *Handlers) ListMine(c *gin.Context) {
	ownerID, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, response.ErrorResponse{Error: "unauthorized"})
		return
	}

	assignments, err := h.svc.ListByOwner(c, uint(ownerID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{Error: "assignment_list_failed", Message: err.Error()})
		return
	}

	out := make([]dto.AssignmentView, 0, len(assignments))
	for _, a := range assignments {
		out = append(out, toView(a, nil, true))
	}

	c.JSON(http.StatusOK, out)
}

func (h *Handlers) Get(c *gin.Context) {
	assignmentID := c.Param("id")
	if assignmentID == "" {
		c.JSON(http.StatusBadRequest, response.ErrorResponse{Error: "invalid_id"})
		return
	}

	assignment, err := h.svc.Get(c, assignmentID)
	if err != nil {
		status := http.StatusInternalServerError
		errCode := "assignment_retrieve_failed"
		if err == ErrNotFound {
			status = http.StatusNotFound
			errCode = "not_found"
		}
		c.JSON(status, response.ErrorResponse{Error: errCode, Message: err.Error()})
		return
	}

	settings, err := h.svc.GetTestSettings(c, assignment.TestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, response.ErrorResponse{Error: "assignment_retrieve_failed", Message: err.Error()})
		return
	}

	isOwner := false
	if id, ok := userIDFromCtx(c); ok {
		if uint(id) == assignment.OwnerID {
			isOwner = true
		}
	}

	c.JSON(http.StatusOK, toView(*assignment, settings, isOwner))
}

func toView(a Assignment, settings *TestSettingsSummary, isOwner bool) dto.AssignmentView {
	view := dto.AssignmentView{
		AssignmentID: a.ID,
		TestID:       a.TestID,
		Title:        a.Title,
		ShareURL:     "/take-test?assignmentId=" + a.ID,
		IsOwner:      isOwner,
	}
	if isOwner {
		view.ManageURL = "/dashboard/assignments/" + a.ID
	}
	if settings != nil {
		view.DurationSec = settings.DurationSec
		if settings.MaxAttemptTimeSec > 0 {
			view.MaxAttemptTimeSec = settings.MaxAttemptTimeSec
		}
	}
	return view
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
