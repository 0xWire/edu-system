package ai

import (
	"context"
	"errors"
	"testing"

	"edu-system/internal/ai/dto"
)

type mockProvider struct {
	name       string
	model      string
	configured bool
	responses  []mockProviderResponse
	calls      int
}

type mockProviderResponse struct {
	text string
	err  error
}

func (m *mockProvider) Name() string {
	return m.name
}

func (m *mockProvider) Model() string {
	return m.model
}

func (m *mockProvider) IsConfigured() bool {
	return m.configured
}

func (m *mockProvider) Complete(_ context.Context, _ CompletionRequest) (*CompletionResponse, error) {
	if m.calls >= len(m.responses) {
		m.calls++
		return nil, errors.New("no mock response")
	}
	resp := m.responses[m.calls]
	m.calls++
	if resp.err != nil {
		return nil, resp.err
	}
	return &CompletionResponse{Text: resp.text, Model: m.model}, nil
}

func TestRunPipelineFallbackProviders(t *testing.T) {
	primary := &mockProvider{
		name:       ProviderOpenAI,
		model:      "primary-model",
		configured: true,
		responses: []mockProviderResponse{
			{err: errors.New("primary down")},
			{err: errors.New("primary down")},
			{err: errors.New("primary down")},
			{err: errors.New("primary down")},
		},
	}

	fallback := &mockProvider{
		name:       ProviderLocal,
		model:      "local-model",
		configured: true,
		responses: []mockProviderResponse{
			{text: `{"summary":"plan","learning_objectives":["obj"],"topic_blocks":[{"topic":"T1","weight_percent":100,"key_facts":["f1"]}],"test_blueprint":{"variants_count":2,"questions_per_variant":5,"question_type_targets":[{"type":"single","count":5,"focus":"core"}]},"assumptions":[],"risks":[]}`},
			{text: `{"test_variants":[{"title":"V1","instructions":"instr","questions":[{"question":"Q1","type":"single","options":["A","B"],"correct_answers":[0],"explanation":"exp"}]}],"study_notes":{"title":"Notes","summary":"S","key_points":["K"],"common_mistakes":["M"],"preparation_advice":["P"]},"practice_test":{"title":"Practice","questions":[{"question":"PQ1","type":"single","options":["A","B"],"correct_answers":[1],"explanation":"pexp"}]}}`},
			{text: `{"is_aligned":true,"alignment_score":96,"issues":[],"missing_topics":[],"extra_topics":[],"summary":"validated"}`},
			{text: `{"teacher_summary":"ready","ready_for_use":true,"applied_fixes":["none"],"unresolved_warnings":[],"test_variants":[{"title":"V1","instructions":"instr","questions":[{"question":"Q1","type":"single","options":["A","B"],"correct_answers":[0],"explanation":"exp"}]}],"study_notes":{"title":"Notes","summary":"S","key_points":["K"],"common_mistakes":["M"],"preparation_advice":["P"]},"practice_test":{"title":"Practice","questions":[{"question":"PQ1","type":"single","options":["A","B"],"correct_answers":[1],"explanation":"pexp"}]}}`},
		},
	}

	svc := newServiceWithProviders(
		map[string]Provider{
			ProviderOpenAI: primary,
			ProviderLocal:  fallback,
		},
		[]string{ProviderOpenAI, ProviderLocal},
	)

	req := &dto.PipelineRunRequest{
		Material: dto.MaterialInput{Text: "methodical material"},
		GenerationConfig: dto.GenerationConfig{
			VariantsCount:       2,
			QuestionsPerVariant: 5,
		},
	}

	resp, err := svc.RunPipeline(context.Background(), 1, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(resp.ProviderTrace) != 4 {
		t.Fatalf("expected provider trace for 4 layers, got %d", len(resp.ProviderTrace))
	}
	for _, trace := range resp.ProviderTrace {
		if trace.Provider != ProviderLocal {
			t.Fatalf("expected fallback provider %q, got %q", ProviderLocal, trace.Provider)
		}
		if trace.Attempts != 2 {
			t.Fatalf("expected 2 attempts per layer, got %d", trace.Attempts)
		}
		if !trace.FallbackUsed {
			t.Fatal("expected fallback to be marked as used")
		}
	}

	if !resp.Final.ReadyForUse {
		t.Fatal("expected final output to be ready for use")
	}
}

func TestDecodeModelJSONWithMarkdownFence(t *testing.T) {
	raw := "```json\n{\"summary\":\"ok\",\"learning_objectives\":[],\"topic_blocks\":[],\"test_blueprint\":{\"variants_count\":1,\"questions_per_variant\":1,\"question_type_targets\":[]},\"assumptions\":[],\"risks\":[]}\n```"

	var out dto.PlanOutput
	if err := decodeModelJSON(raw, &out); err != nil {
		t.Fatalf("decodeModelJSON returned error: %v", err)
	}
	if out.Summary != "ok" {
		t.Fatalf("expected summary=ok, got %q", out.Summary)
	}
}
