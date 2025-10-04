package testAttempt

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"

	dto "edu-system/internal/testAttempt/dto"
)

type Handlers struct {
	svc *Service
	v   *validator.Validate
}

func NewHandlers(svc *Service) *Handlers {
	return &Handlers{svc: svc, v: validator.New()}
}

// POST /v1/attempts/start
func (h *Handlers) Start(c *gin.Context) {
	var req dto.StartAttemptRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("bad_json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("invalid", err.Error()))
		return
	}

	var userIDPtr *UserID
	if uid, ok := userIDFromCtx(c); ok {
		u := UserID(uid)
		userIDPtr = &u
	}
	id, err := h.svc.StartAttempt(c, userIDPtr, req.GuestName, TestID(req.TestID))
	if err != nil {
		writeDomainErr(c, err)
		return
	}
	av, _, err := h.svc.NextQuestion(c, userIDPtr, id)
	if err != nil && err != ErrNoMoreQuestions {
		writeDomainErr(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.AttemptView{
		AttemptID:   av.AttemptID,
		Status:      av.Status,
		Version:     av.Version,
		TimeLeftSec: av.TimeLeftSec,
		Total:       av.Total,
		Cursor:      av.Cursor,
		GuestName:   av.GuestName,
	})
}

// GET /v1/attempts/:id/question
func (h *Handlers) NextQuestion(c *gin.Context) {
	attemptID := c.Param("id")
	if attemptID == "" {
		c.JSON(http.StatusBadRequest, errJSON("invalid_id", "missing id"))
		return
	}
	var userIDPtr *UserID
	if uid, ok := userIDFromCtx(c); ok {
		u := UserID(uid)
		userIDPtr = &u
	}
	av, qv, err := h.svc.NextQuestion(c, userIDPtr, AttemptID(attemptID))
	if err != nil {
		writeDomainErr(c, err)
		return
	}
	resp := dto.NextQuestionResponse{
		Attempt: dto.AttemptView{
			AttemptID:   av.AttemptID,
			Status:      av.Status,
			Version:     av.Version,
			TimeLeftSec: av.TimeLeftSec,
			Total:       av.Total,
			Cursor:      av.Cursor,
			GuestName:   av.GuestName,
		},
		Question: dto.QuestionView{
			ID:           qv.ID,
			QuestionText: qv.QuestionText,
			ImageURL:     qv.ImageURL,
			Options:      make([]dto.OptionView, len(qv.Options)),
		},
	}
	for i, o := range qv.Options {
		resp.Question.Options[i] = dto.OptionView{ID: o.ID, OptionText: o.OptionText, ImageURL: o.ImageURL}
	}
	c.JSON(http.StatusOK, resp)
}

// POST /v1/attempts/:id/answer
func (h *Handlers) Answer(c *gin.Context) {
	attemptID := c.Param("id")
	if attemptID == "" {
		c.JSON(http.StatusBadRequest, errJSON("invalid_id", "missing id"))
		return
	}
	var req dto.AnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("bad_json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("invalid", err.Error()))
		return
	}
	var userIDPtr *UserID
	if uid, ok := userIDFromCtx(c); ok {
		u := UserID(uid)
		userIDPtr = &u
	}
	payload, err := normalizePayload(req.Payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, errJSON("invalid_payload", err.Error()))
		return
	}
	av, answered, err := h.svc.AnswerCurrent(c, userIDPtr, AttemptID(attemptID), req.Version, payload)
	if err != nil {
		writeDomainErr(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.AnswerResponse{
		Attempt: dto.AttemptView{
			AttemptID:   av.AttemptID,
			Status:      av.Status,
			Version:     av.Version,
			TimeLeftSec: av.TimeLeftSec,
			Total:       av.Total,
			Cursor:      av.Cursor,
			GuestName:   av.GuestName,
		},
		QuestionID: answered.QuestionID,
	})
}

// POST /v1/attempts/:id/submit
func (h *Handlers) Submit(c *gin.Context) {
	attemptID := c.Param("id")
	if attemptID == "" {
		c.JSON(http.StatusBadRequest, errJSON("invalid_id", "missing id"))
		return
	}
	var req dto.SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("bad_json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("invalid", err.Error()))
		return
	}
	var userIDPtr *UserID
	if uid, ok := userIDFromCtx(c); ok {
		u := UserID(uid)
		userIDPtr = &u
	}
	av, err := h.svc.Submit(c, userIDPtr, AttemptID(attemptID), req.Version)
	if err != nil {
		writeDomainErr(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.SubmitResponse{Attempt: dto.AttemptView{
		AttemptID:   av.AttemptID,
		Status:      av.Status,
		Version:     av.Version,
		TimeLeftSec: av.TimeLeftSec,
		Total:       av.Total,
		Cursor:      av.Cursor,
		GuestName:   av.GuestName,
	}})
}

// POST /v1/attempts/:id/cancel
func (h *Handlers) Cancel(c *gin.Context) {
	attemptID := c.Param("id")
	if attemptID == "" {
		c.JSON(http.StatusBadRequest, errJSON("invalid_id", "missing id"))
		return
	}
	var req dto.SubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("bad_json", err.Error()))
		return
	}
	if err := h.v.Struct(req); err != nil {
		c.JSON(http.StatusBadRequest, errJSON("invalid", err.Error()))
		return
	}
	var userIDPtr *UserID
	if uid, ok := userIDFromCtx(c); ok {
		u := UserID(uid)
		userIDPtr = &u
	}
	av, err := h.svc.Cancel(c, userIDPtr, AttemptID(attemptID), req.Version)
	if err != nil {
		writeDomainErr(c, err)
		return
	}
	c.JSON(http.StatusOK, dto.SubmitResponse{Attempt: dto.AttemptView{
		AttemptID:   av.AttemptID,
		Status:      av.Status,
		Version:     av.Version,
		TimeLeftSec: av.TimeLeftSec,
		Total:       av.Total,
		Cursor:      av.Cursor,
		GuestName:   av.GuestName,
	}})
}

// Helpers.

func userIDFromCtx(c *gin.Context) (uint64, bool) {
	idv, ok := c.Get("user_id")
	if !ok {
		return 0, false
	}
	switch v := idv.(type) {
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
		return 0, false
	default:
		return 0, false
	}
}

func errJSON(code, msg string) gin.H { return gin.H{"error": gin.H{"code": code, "message": msg}} }

func writeDomainErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrClosed):
		c.JSON(http.StatusGone, errJSON("attempt_closed", err.Error()))
	case errors.Is(err, ErrVersionMismatch):
		c.JSON(http.StatusConflict, errJSON("version_mismatch", err.Error()))
	case errors.Is(err, ErrInvalidState), errors.Is(err, ErrValidation):
		c.JSON(http.StatusBadRequest, errJSON("invalid", err.Error()))
	case errors.Is(err, ErrNoMoreQuestions):
		c.JSON(http.StatusOK, gin.H{"done": true})
	case errors.Is(err, ErrGuestsNotAllowed), errors.Is(err, ErrForbidden):
		c.JSON(http.StatusForbidden, errJSON("forbidden", err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, errJSON("internal", err.Error()))
	}
}

func normalizePayload(in interface{}) (AnswerPayload, error) {
	m, ok := in.(map[string]any)
	if !ok {
		return AnswerPayload{}, fmt.Errorf("payload must be object")
	}
	if sel, ok := m["selected"].([]any); ok {
		ints := make([]int, 0, len(sel))
		for _, x := range sel {
			if f, ok := x.(float64); ok {
				ints = append(ints, int(f))
			}
		}
		if len(ints) == 1 {
			return AnswerPayload{Kind: AnswerSingle, Single: ints[0]}, nil
		}
		return AnswerPayload{Kind: AnswerMulti, Multi: ints}, nil
	}
	if t, ok := m["text"].(string); ok {
		return AnswerPayload{Kind: AnswerText, Text: t}, nil
	}
	if cm, ok := m["code"].(map[string]any); ok {
		var lang, body string
		if v, ok := cm["lang"].(string); ok {
			lang = v
		}
		if v, ok := cm["body"].(string); ok {
			body = v
		}
		return AnswerPayload{Kind: AnswerCode, Code: &CodePayload{Lang: lang, Body: body}}, nil
	}
	return AnswerPayload{}, fmt.Errorf("unknown payload shape")
}
