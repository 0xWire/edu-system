package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type openAICompatibleProvider struct {
	name         string
	baseURL      string
	model        string
	apiKey       string
	authOptional bool
	extraHeaders map[string]string
	httpClient   *http.Client
}

func newOpenAICompatibleProvider(
	name string,
	baseURL string,
	model string,
	apiKey string,
	authOptional bool,
	extraHeaders map[string]string,
	httpClient *http.Client,
) Provider {
	return &openAICompatibleProvider{
		name:         strings.ToLower(strings.TrimSpace(name)),
		baseURL:      strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		model:        strings.TrimSpace(model),
		apiKey:       strings.TrimSpace(apiKey),
		authOptional: authOptional,
		extraHeaders: extraHeaders,
		httpClient:   httpClient,
	}
}

func (p *openAICompatibleProvider) Name() string {
	return p.name
}

func (p *openAICompatibleProvider) Model() string {
	return p.model
}

func (p *openAICompatibleProvider) IsConfigured() bool {
	if p.baseURL == "" || p.model == "" {
		return false
	}
	if p.authOptional {
		return true
	}
	return p.apiKey != ""
}

func (p *openAICompatibleProvider) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	if !p.IsConfigured() {
		return nil, fmt.Errorf("provider %s is not configured", p.name)
	}

	body := openAIChatRequest{
		Model:       p.model,
		Messages:    req.Messages,
		Temperature: req.Temperature,
	}
	if req.RequireJSON {
		body.ResponseFormat = &openAIResponseFormat{Type: "json_object"}
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if p.apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	}
	for key, value := range p.extraHeaders {
		httpReq.Header.Set(key, value)
	}

	resp, err := p.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("provider %s returned status %d: %s", p.name, resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var payload openAIChatResponse
	if err := json.Unmarshal(respBody, &payload); err != nil {
		return nil, fmt.Errorf("provider %s invalid response: %w", p.name, err)
	}

	if len(payload.Choices) == 0 {
		return nil, fmt.Errorf("provider %s returned no choices", p.name)
	}

	content := strings.TrimSpace(payload.Choices[0].Message.Content)
	if content == "" {
		return nil, fmt.Errorf("provider %s returned empty content", p.name)
	}

	model := strings.TrimSpace(payload.Model)
	if model == "" {
		model = p.model
	}

	return &CompletionResponse{Text: content, Model: model}, nil
}

type openAIChatRequest struct {
	Model          string                `json:"model"`
	Messages       []Message             `json:"messages"`
	Temperature    float64               `json:"temperature,omitempty"`
	ResponseFormat *openAIResponseFormat `json:"response_format,omitempty"`
}

type openAIResponseFormat struct {
	Type string `json:"type"`
}

type openAIChatResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}
