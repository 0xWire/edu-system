package testAttempt

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

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
	meta := AttemptMetadata{ClientIP: c.ClientIP()}
	if req.Fingerprint != nil {
		meta.Fingerprint = *req.Fingerprint
	} else if header := c.GetHeader("X-Attempt-Fingerprint"); header != "" {
		meta.Fingerprint = header
	} else if cookie, err := c.Cookie("attempt_fingerprint"); err == nil {
		meta.Fingerprint = cookie
	}
	id, err := h.svc.StartAttempt(c, userIDPtr, req.GuestName, AssignmentID(req.AssignmentID), meta)
	if err != nil {
		writeDomainErr(c, err)
		return
	}
	av, _, err := h.svc.NextQuestion(c, userIDPtr, id)
	if err != nil && err != ErrNoMoreQuestions {
		writeDomainErr(c, err)
		return
	}
	c.JSON(http.StatusOK, toDTOAttemptView(av))
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
		Attempt: toDTOAttemptView(av),
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
		Attempt:    toDTOAttemptView(av),
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
	c.JSON(http.StatusOK, dto.SubmitResponse{Attempt: toDTOAttemptView(av)})
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
	c.JSON(http.StatusOK, dto.SubmitResponse{Attempt: toDTOAttemptView(av)})
}

// GET /v1/attempts?assignment_id=
func (h *Handlers) ListByAssignment(c *gin.Context) {
	assignmentID := c.Query("assignment_id")
	if assignmentID == "" {
		c.JSON(http.StatusBadRequest, errJSON("missing_assignment_id", "assignment_id query parameter is required"))
		return
	}
	ownerID, ok := userIDFromCtx(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, errJSON("unauthorized", "authentication required"))
		return
	}
	attempts, err := h.svc.ListAssignmentAttempts(c, UserID(ownerID), AssignmentID(assignmentID))
	if err != nil {
		writeDomainErr(c, err)
		return
	}
	resp := dto.AttemptSummaryResponse{Attempts: make([]dto.AttemptSummaryView, 0, len(attempts))}
	for _, a := range attempts {
		participant := dto.ParticipantView{}
		if a.User != nil {
			participant.Kind = "user"
			uid := uint64(a.User.ID)
			participant.UserID = &uid
			participant.Name = a.User.FullName()
		} else if a.UserID != 0 {
			participant.Kind = "user"
			uid := uint64(a.UserID)
			participant.UserID = &uid
			participant.Name = fmt.Sprintf("User #%d", uid)
		} else {
			participant.Kind = "guest"
			if a.GuestName != nil && *a.GuestName != "" {
				participant.Name = *a.GuestName
			} else {
				participant.Name = "Guest"
			}
		}
		resp.Attempts = append(resp.Attempts, dto.AttemptSummaryView{
			AttemptID:    string(a.AttemptID),
			AssignmentID: string(a.AssignmentID),
			TestID:       string(a.TestID),
			Status:       string(a.Status),
			StartedAt:    a.StartedAt,
			SubmittedAt:  a.SubmittedAt,
			ExpiredAt:    a.ExpiredAt,
			DurationSec:  int(a.Duration / time.Second),
			Score:        a.Score,
			MaxScore:     a.MaxScore,
			Participant:  participant,
		})
	}
	c.JSON(http.StatusOK, resp)
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

func toDTOAttemptView(av AttemptView) dto.AttemptView {
	return dto.AttemptView{
		AttemptID:    av.AttemptID,
		AssignmentID: av.AssignmentID,
		Status:       av.Status,
		Version:      av.Version,
		TimeLeftSec:  av.TimeLeftSec,
		Total:        av.Total,
		Cursor:       av.Cursor,
		GuestName:    av.GuestName,
		Policy: dto.AttemptPolicyView{
			ShuffleQuestions:     av.Policy.ShuffleQuestions,
			ShuffleAnswers:       av.Policy.ShuffleAnswers,
			RequireAllAnswered:   av.Policy.RequireAllAnswered,
			LockAnswerOnConfirm:  av.Policy.LockAnswerOnConfirm,
			DisableCopy:          av.Policy.DisableCopy,
			DisableBrowserBack:   av.Policy.DisableBrowserBack,
			ShowElapsedTime:      av.Policy.ShowElapsedTime,
			AllowNavigation:      av.Policy.AllowNavigation,
			QuestionTimeLimitSec: av.Policy.QuestionTimeLimitSec,
			MaxAttemptTimeSec:    av.Policy.MaxAttemptTimeSec,
			RevealScoreMode:      av.Policy.RevealScoreMode,
			RevealSolutions:      av.Policy.RevealSolutions,
		},
	}
}

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
	case errors.Is(err, ErrMaxAttempts):
		c.JSON(http.StatusTooManyRequests, errJSON("max_attempts", err.Error()))
	case errors.Is(err, ErrQuestionTimeLimit):
		c.JSON(http.StatusGone, errJSON("question_time_limit", err.Error()))
	case errors.Is(err, ErrAssignmentNotFound):
		c.JSON(http.StatusNotFound, errJSON("assignment_not_found", err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, errJSON("internal", err.Error()))
	}
}

func normalizePayload(in interface{}) (AnswerPayload, error) {
	m, ok := in.(map[string]any)
	if !ok {
		return AnswerPayload{}, fmt.Errorf("payload must be object")
	}

	if kindStr, ok := m["kind"].(string); ok {
		switch kindStr {
		case "single":
			if v, ok := m["selected"].(float64); ok {
				return AnswerPayload{Kind: AnswerSingle, Single: int(v)}, nil
			}
			if arr, ok := m["selected"].([]any); ok && len(arr) > 0 {
				if f, ok := arr[0].(float64); ok {
					return AnswerPayload{Kind: AnswerSingle, Single: int(f)}, nil
				}
			}
			return AnswerPayload{}, fmt.Errorf("%w: single requires 'selected'", ErrValidation)
		case "multi":
			vals, ok := readIntArray(m["selected_options"])
			if !ok {
				vals, ok = readIntArray(m["selected"])
			}
			if !ok {
				return AnswerPayload{}, fmt.Errorf("%w: multi requires 'selected_options'", ErrValidation)
			}
			return AnswerPayload{Kind: AnswerMulti, Multi: vals}, nil
		case "text":
			if t, ok := m["text"].(string); ok {
				return AnswerPayload{Kind: AnswerText, Text: t}, nil
			}
			return AnswerPayload{}, fmt.Errorf("%w: text requires 'text'", ErrValidation)
		case "code":
			cm, ok := m["code"].(map[string]any)
			if !ok {
				return AnswerPayload{}, fmt.Errorf("%w: code requires 'code' object", ErrValidation)
			}
			lang, _ := cm["lang"].(string)
			body, _ := cm["body"].(string)
			return AnswerPayload{Kind: AnswerCode, Code: &CodePayload{Lang: lang, Body: body}}, nil
		default:
			return AnswerPayload{}, fmt.Errorf("%w: unknown kind", ErrValidation)
		}
	}

	if sel, ok := m["selected"].([]any); ok {
		ints, _ := readIntArray(sel)
		if len(ints) == 1 {
			return AnswerPayload{Kind: AnswerSingle, Single: ints[0]}, nil
		}
		return AnswerPayload{Kind: AnswerMulti, Multi: ints}, nil
	}
	if t, ok := m["text"].(string); ok {
		return AnswerPayload{Kind: AnswerText, Text: t}, nil
	}
	if cm, ok := m["code"].(map[string]any); ok {
		lang, _ := cm["lang"].(string)
		body, _ := cm["body"].(string)
		return AnswerPayload{Kind: AnswerCode, Code: &CodePayload{Lang: lang, Body: body}}, nil
	}
	return AnswerPayload{}, fmt.Errorf("unknown payload shape")
}

func readIntArray(v interface{}) ([]int, bool) {
	switch arr := v.(type) {
	case []any:
		out := make([]int, 0, len(arr))
		for _, x := range arr {
			if f, ok := x.(float64); ok {
				out = append(out, int(f))
			}
		}
		return out, true
	case []int:
		return arr, true
	case []float64:
		out := make([]int, len(arr))
		for i, f := range arr {
			out[i] = int(f)
		}
		return out, true
	default:
		return nil, false
	}
}
