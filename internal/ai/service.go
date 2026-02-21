package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"edu-system/internal/ai/dto"
	"edu-system/internal/platform"
)

const (
	layerPlan     = "plan"
	layerGenerate = "generate"
	layerValidate = "validate"
	layerRefine   = "refine"
)

var (
	ErrNoProviderConfigured = errors.New("no configured ai providers")
	ErrUnsupportedProvider  = errors.New("unsupported ai provider")
	ErrInvalidLayer         = errors.New("invalid ai layer name")
	ErrLayerFailed          = errors.New("ai layer failed")
)

type LayerError struct {
	Layer string
	Err   error
}

func (e *LayerError) Error() string {
	return fmt.Sprintf("layer %s failed: %v", e.Layer, e.Err)
}

func (e *LayerError) Unwrap() error {
	return e.Err
}

type Service interface {
	RunPipeline(ctx context.Context, ownerID uint, req *dto.PipelineRunRequest) (*dto.PipelineRunResponse, error)
	ProviderStatuses() []dto.ProviderStatus
}

type service struct {
	providers    map[string]Provider
	defaultOrder []string
}

func NewService(cfg *platform.Config) Service {
	timeout := time.Duration(cfg.AIHTTPTimeoutSec) * time.Second
	if timeout <= 0 {
		timeout = 90 * time.Second
	}
	client := &http.Client{Timeout: timeout}

	providers := map[string]Provider{
		ProviderOpenAI: newOpenAICompatibleProvider(
			ProviderOpenAI,
			cfg.OpenAIBaseURL,
			cfg.OpenAIModel,
			cfg.OpenAIAPIKey,
			false,
			nil,
			client,
		),
		ProviderGemini: newGeminiProvider(
			cfg.GeminiBaseURL,
			cfg.GeminiModel,
			cfg.GeminiAPIKey,
			client,
		),
		ProviderDeepSeek: newOpenAICompatibleProvider(
			ProviderDeepSeek,
			cfg.DeepSeekBaseURL,
			cfg.DeepSeekModel,
			cfg.DeepSeekAPIKey,
			false,
			nil,
			client,
		),
		ProviderOpenRouter: newOpenAICompatibleProvider(
			ProviderOpenRouter,
			cfg.OpenRouterBaseURL,
			cfg.OpenRouterModel,
			cfg.OpenRouterAPIKey,
			false,
			nil,
			client,
		),
		ProviderLocal: newOpenAICompatibleProvider(
			ProviderLocal,
			cfg.LocalAIBaseURL,
			cfg.LocalAIModel,
			cfg.LocalAIAPIKey,
			true,
			nil,
			client,
		),
	}

	order := normalizeProviderOrder(cfg.AIProviderOrder, false)
	if len(order) == 0 {
		order = defaultProviderOrder()
	}

	return &service{
		providers:    providers,
		defaultOrder: order,
	}
}

func (s *service) ProviderStatuses() []dto.ProviderStatus {
	names := make([]string, 0, len(s.providers))
	for name := range s.providers {
		names = append(names, name)
	}
	sort.Strings(names)

	statuses := make([]dto.ProviderStatus, 0, len(names))
	for _, name := range names {
		provider := s.providers[name]
		statuses = append(statuses, dto.ProviderStatus{
			Name:       name,
			Configured: provider.IsConfigured(),
			Model:      provider.Model(),
		})
	}
	return statuses
}

func (s *service) RunPipeline(ctx context.Context, ownerID uint, req *dto.PipelineRunRequest) (*dto.PipelineRunResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	material := normalizeMaterial(req.Material)
	if material.Text == "" && material.SourceURL == "" {
		return nil, errors.New("material.text or material.source_url is required")
	}

	cfg := normalizeGenerationConfig(req.GenerationConfig, material.Language)
	orders, err := s.resolveLayerOrders(req.Provider)
	if err != nil {
		return nil, err
	}

	var plan dto.PlanOutput
	planTrace, err := s.runLayer(
		ctx,
		layerPlan,
		orders[layerPlan],
		buildPlanMessages(material, cfg),
		func(raw string) error {
			return decodeModelJSON(raw, &plan)
		},
	)
	if err != nil {
		return nil, err
	}
	normalizePlan(&plan, cfg)

	var generated dto.GenerationOutput
	generateTrace, err := s.runLayer(
		ctx,
		layerGenerate,
		orders[layerGenerate],
		buildGenerationMessages(material, cfg, plan),
		func(raw string) error {
			return decodeModelJSON(raw, &generated)
		},
	)
	if err != nil {
		return nil, err
	}
	normalizeGeneratedOutput(&generated, cfg)

	var validation dto.ValidationOutput
	validationTrace, err := s.runLayer(
		ctx,
		layerValidate,
		orders[layerValidate],
		buildValidationMessages(material, plan, generated),
		func(raw string) error {
			return decodeModelJSON(raw, &validation)
		},
	)
	if err != nil {
		return nil, err
	}
	normalizeValidation(&validation)

	var finalResult dto.FinalOutput
	refineTrace, err := s.runLayer(
		ctx,
		layerRefine,
		orders[layerRefine],
		buildRefineMessages(material, cfg, plan, generated, validation),
		func(raw string) error {
			return decodeModelJSON(raw, &finalResult)
		},
	)
	if err != nil {
		return nil, err
	}
	normalizeFinal(&finalResult, generated, validation)

	_ = ownerID // retained for future audit/logging use

	return &dto.PipelineRunResponse{
		Plan:       plan,
		Draft:      generated,
		Validation: validation,
		Final:      finalResult,
		ProviderTrace: []dto.LayerProviderTrace{
			planTrace,
			generateTrace,
			validationTrace,
			refineTrace,
		},
	}, nil
}

func (s *service) resolveLayerOrders(selection *dto.ProviderSelection) (map[string][]string, error) {
	baseOrder := append([]string(nil), s.defaultOrder...)
	if selection != nil && len(selection.Order) > 0 {
		strictOrder, err := normalizeProviderOrderWithErr(selection.Order, true)
		if err != nil {
			return nil, err
		}
		baseOrder = strictOrder
	}
	if len(baseOrder) == 0 {
		return nil, ErrNoProviderConfigured
	}

	layers := []string{layerPlan, layerGenerate, layerValidate, layerRefine}
	result := make(map[string][]string, len(layers))
	for _, layer := range layers {
		result[layer] = append([]string(nil), baseOrder...)
	}

	if selection == nil || len(selection.LayerOrder) == 0 {
		return result, nil
	}

	for layerName, order := range selection.LayerOrder {
		layer := strings.ToLower(strings.TrimSpace(layerName))
		if _, exists := result[layer]; !exists {
			return nil, fmt.Errorf("%w: %s", ErrInvalidLayer, layerName)
		}
		normalized, err := normalizeProviderOrderWithErr(order, true)
		if err != nil {
			return nil, err
		}
		if len(normalized) == 0 {
			return nil, fmt.Errorf("%w for layer %s", ErrNoProviderConfigured, layer)
		}
		result[layer] = normalized
	}

	return result, nil
}

func (s *service) runLayer(
	ctx context.Context,
	layer string,
	order []string,
	messages []Message,
	decodeFn func(raw string) error,
) (dto.LayerProviderTrace, error) {
	trace := dto.LayerProviderTrace{Layer: layer}
	if len(order) == 0 {
		return trace, &LayerError{Layer: layer, Err: ErrNoProviderConfigured}
	}

	errorMessages := make([]string, 0)
	attempts := 0

	for idx, providerName := range order {
		provider, exists := s.providers[providerName]
		if !exists {
			errorMessages = append(errorMessages, fmt.Sprintf("provider %s is not registered", providerName))
			continue
		}
		if !provider.IsConfigured() {
			errorMessages = append(errorMessages, fmt.Sprintf("provider %s is not configured", providerName))
			continue
		}

		attempts++
		layerCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
		completion, err := provider.Complete(layerCtx, CompletionRequest{
			Messages:    messages,
			Temperature: 0.2,
			RequireJSON: true,
		})
		cancel()
		if err != nil {
			errorMessages = append(errorMessages, fmt.Sprintf("provider %s request error: %v", providerName, err))
			continue
		}

		if err := decodeFn(completion.Text); err != nil {
			errorMessages = append(errorMessages, fmt.Sprintf("provider %s parse error: %v", providerName, err))
			continue
		}

		trace.Provider = providerName
		trace.Model = completion.Model
		trace.Attempts = attempts
		trace.FallbackUsed = idx > 0 || attempts > 1
		trace.Errors = errorMessages
		return trace, nil
	}

	trace.Attempts = attempts
	trace.Errors = errorMessages
	if attempts == 0 {
		return trace, &LayerError{Layer: layer, Err: ErrNoProviderConfigured}
	}

	return trace, &LayerError{Layer: layer, Err: ErrLayerFailed}
}

func decodeModelJSON(raw string, out any) error {
	candidates := make([]string, 0, 3)
	clean := strings.TrimSpace(raw)
	if clean == "" {
		return errors.New("empty model response")
	}
	candidates = append(candidates, clean)

	if stripped := stripMarkdownCodeFence(clean); stripped != "" {
		candidates = append(candidates, stripped)
	}
	if jsonObj := extractFirstJSONObject(clean); jsonObj != "" {
		candidates = append(candidates, jsonObj)
	}

	seen := map[string]struct{}{}
	for _, candidate := range candidates {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if _, exists := seen[candidate]; exists {
			continue
		}
		seen[candidate] = struct{}{}
		if err := json.Unmarshal([]byte(candidate), out); err == nil {
			return nil
		}
	}

	return errors.New("could not parse JSON from model response")
}

func stripMarkdownCodeFence(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if !strings.HasPrefix(trimmed, "```") {
		return ""
	}

	lines := strings.Split(trimmed, "\n")
	if len(lines) < 3 {
		return ""
	}

	if !strings.HasPrefix(lines[0], "```") {
		return ""
	}
	last := lines[len(lines)-1]
	if strings.TrimSpace(last) != "```" {
		return ""
	}

	return strings.Join(lines[1:len(lines)-1], "\n")
}

func extractFirstJSONObject(raw string) string {
	start := -1
	depth := 0
	inString := false
	escaped := false

	for i, r := range raw {
		if escaped {
			escaped = false
			continue
		}
		if r == '\\' {
			escaped = true
			continue
		}
		if r == '"' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}

		switch r {
		case '{':
			if depth == 0 {
				start = i
			}
			depth++
		case '}':
			if depth == 0 {
				continue
			}
			depth--
			if depth == 0 && start >= 0 {
				return raw[start : i+1]
			}
		}
	}

	return ""
}

func normalizeMaterial(material dto.MaterialInput) dto.MaterialInput {
	material.Title = strings.TrimSpace(material.Title)
	material.Text = strings.TrimSpace(material.Text)
	material.SourceURL = strings.TrimSpace(material.SourceURL)
	material.Language = strings.TrimSpace(material.Language)
	material.AdditionalNote = strings.TrimSpace(material.AdditionalNote)

	if material.Text == "" && material.SourceURL != "" {
		material.Text = fmt.Sprintf("Primary source URL: %s", material.SourceURL)
	}

	return material
}

func normalizeGenerationConfig(cfg dto.GenerationConfig, materialLanguage string) dto.GenerationConfig {
	if cfg.VariantsCount <= 0 {
		cfg.VariantsCount = 3
	}
	if cfg.VariantsCount > 10 {
		cfg.VariantsCount = 10
	}
	if cfg.QuestionsPerVariant <= 0 {
		cfg.QuestionsPerVariant = 20
	}
	if cfg.QuestionsPerVariant > 100 {
		cfg.QuestionsPerVariant = 100
	}

	cfg.Difficulty = strings.TrimSpace(cfg.Difficulty)
	if cfg.Difficulty == "" {
		cfg.Difficulty = "mixed"
	}

	cfg.Audience = strings.TrimSpace(cfg.Audience)
	if cfg.Audience == "" {
		cfg.Audience = "students"
	}

	cfg.OutputLanguage = strings.TrimSpace(cfg.OutputLanguage)
	if cfg.OutputLanguage == "" {
		cfg.OutputLanguage = strings.TrimSpace(materialLanguage)
	}
	if cfg.OutputLanguage == "" {
		cfg.OutputLanguage = "ru"
	}

	if cfg.IncludeExplanations == nil {
		value := true
		cfg.IncludeExplanations = &value
	}
	if cfg.IncludePracticeTests == nil {
		value := true
		cfg.IncludePracticeTests = &value
	}

	return cfg
}

func normalizePlan(plan *dto.PlanOutput, cfg dto.GenerationConfig) {
	if plan == nil {
		return
	}

	if plan.TestBlueprint.VariantsCount <= 0 {
		plan.TestBlueprint.VariantsCount = cfg.VariantsCount
	}
	if plan.TestBlueprint.QuestionsPerVariant <= 0 {
		plan.TestBlueprint.QuestionsPerVariant = cfg.QuestionsPerVariant
	}
	if len(plan.TestBlueprint.QuestionTypeTargets) == 0 {
		plan.TestBlueprint.QuestionTypeTargets = []dto.QuestionTypeTarget{
			{Type: "single", Count: maxInt(1, cfg.QuestionsPerVariant/2), Focus: "core concepts"},
			{Type: "multi", Count: maxInt(1, cfg.QuestionsPerVariant/4), Focus: "advanced checks"},
			{Type: "text", Count: maxInt(1, cfg.QuestionsPerVariant/4), Focus: "reasoning"},
		}
	}
}

func normalizeGeneratedOutput(out *dto.GenerationOutput, cfg dto.GenerationConfig) {
	if out == nil {
		return
	}

	if len(out.TestVariants) > cfg.VariantsCount {
		out.TestVariants = out.TestVariants[:cfg.VariantsCount]
	}

	for i := range out.TestVariants {
		if out.TestVariants[i].Questions == nil {
			out.TestVariants[i].Questions = make([]dto.GeneratedQuestion, 0)
		}
		if len(out.TestVariants[i].Questions) > cfg.QuestionsPerVariant {
			out.TestVariants[i].Questions = out.TestVariants[i].Questions[:cfg.QuestionsPerVariant]
		}
	}

	if !boolValue(cfg.IncludePracticeTests, true) {
		out.PracticeTest = dto.PracticeTest{}
	}
}

func normalizeValidation(validation *dto.ValidationOutput) {
	if validation == nil {
		return
	}
	if validation.AlignmentScore < 0 {
		validation.AlignmentScore = 0
	}
	if validation.AlignmentScore > 100 {
		validation.AlignmentScore = 100
	}
}

func normalizeFinal(final *dto.FinalOutput, draft dto.GenerationOutput, validation dto.ValidationOutput) {
	if final == nil {
		return
	}

	if len(final.TestVariants) == 0 {
		final.TestVariants = draft.TestVariants
	}
	if final.StudyNotes.Title == "" {
		final.StudyNotes = draft.StudyNotes
	}
	if final.PracticeTest.Title == "" && len(final.PracticeTest.Questions) == 0 {
		final.PracticeTest = draft.PracticeTest
	}
	if final.TeacherSummary == "" {
		final.TeacherSummary = validation.Summary
	}
	if !final.ReadyForUse && validation.IsAligned {
		final.ReadyForUse = true
	}
}

func boolValue(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func normalizeProviderOrder(values []string, strict bool) []string {
	order, err := normalizeProviderOrderWithErr(values, strict)
	if err != nil {
		return nil
	}
	return order
}

func normalizeProviderOrderWithErr(values []string, strict bool) ([]string, error) {
	if len(values) == 0 {
		return nil, nil
	}

	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))

	for _, raw := range values {
		name := strings.ToLower(strings.TrimSpace(raw))
		if name == "" {
			continue
		}
		if _, ok := supportedProviders[name]; !ok {
			if strict {
				return nil, fmt.Errorf("%w: %s", ErrUnsupportedProvider, raw)
			}
			continue
		}
		if _, exists := seen[name]; exists {
			continue
		}
		seen[name] = struct{}{}
		result = append(result, name)
	}

	return result, nil
}

func defaultProviderOrder() []string {
	return []string{
		ProviderOpenAI,
		ProviderGemini,
		ProviderDeepSeek,
		ProviderOpenRouter,
		ProviderLocal,
	}
}

func newServiceWithProviders(providers map[string]Provider, defaultOrder []string) *service {
	order := append([]string(nil), defaultOrder...)
	if len(order) == 0 {
		order = defaultProviderOrder()
	}
	return &service{providers: providers, defaultOrder: order}
}
