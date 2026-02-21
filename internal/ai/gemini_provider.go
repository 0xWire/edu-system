package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type geminiProvider struct {
	name       string
	baseURL    string
	model      string
	apiKey     string
	httpClient *http.Client
}

func newGeminiProvider(baseURL, model, apiKey string, httpClient *http.Client) Provider {
	return &geminiProvider{
		name:       ProviderGemini,
		baseURL:    strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		model:      strings.TrimSpace(model),
		apiKey:     strings.TrimSpace(apiKey),
		httpClient: httpClient,
	}
}

func (p *geminiProvider) Name() string {
	return p.name
}

func (p *geminiProvider) Model() string {
	return p.model
}

func (p *geminiProvider) IsConfigured() bool {
	return p.baseURL != "" && p.model != "" && p.apiKey != ""
}

func (p *geminiProvider) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	if !p.IsConfigured() {
		return nil, fmt.Errorf("provider %s is not configured", p.name)
	}

	systemInstruction := ""
	contentBuilder := strings.Builder{}

	for _, m := range req.Messages {
		if m.Role == "system" {
			if systemInstruction == "" {
				systemInstruction = m.Content
			} else {
				systemInstruction += "\n\n" + m.Content
			}
			continue
		}

		if contentBuilder.Len() > 0 {
			contentBuilder.WriteString("\n\n")
		}
		contentBuilder.WriteString(strings.ToUpper(strings.TrimSpace(m.Role)))
		contentBuilder.WriteString(":\n")
		contentBuilder.WriteString(m.Content)
	}

	if contentBuilder.Len() == 0 {
		return nil, fmt.Errorf("provider %s received empty prompt", p.name)
	}

	payload := geminiRequest{
		Contents: []geminiContent{{
			Role: "user",
			Parts: []geminiPart{{
				Text: contentBuilder.String(),
			}},
		}},
		GenerationConfig: &geminiGenerationConfig{
			Temperature: req.Temperature,
		},
	}
	if req.RequireJSON {
		payload.GenerationConfig.ResponseMimeType = "application/json"
	}
	if strings.TrimSpace(systemInstruction) != "" {
		payload.SystemInstruction = &geminiContent{
			Parts: []geminiPart{{Text: systemInstruction}},
		}
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	u := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", p.baseURL, url.PathEscape(p.model), url.QueryEscape(p.apiKey))
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

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

	var parsed geminiResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("provider %s invalid response: %w", p.name, err)
	}

	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("provider %s returned no content", p.name)
	}

	parts := make([]string, 0, len(parsed.Candidates[0].Content.Parts))
	for _, part := range parsed.Candidates[0].Content.Parts {
		text := strings.TrimSpace(part.Text)
		if text != "" {
			parts = append(parts, text)
		}
	}

	if len(parts) == 0 {
		return nil, fmt.Errorf("provider %s returned empty text", p.name)
	}

	return &CompletionResponse{Text: strings.Join(parts, "\n"), Model: p.model}, nil
}

type geminiRequest struct {
	SystemInstruction *geminiContent          `json:"systemInstruction,omitempty"`
	Contents          []geminiContent         `json:"contents"`
	GenerationConfig  *geminiGenerationConfig `json:"generationConfig,omitempty"`
}

type geminiGenerationConfig struct {
	Temperature      float64 `json:"temperature,omitempty"`
	ResponseMimeType string  `json:"responseMimeType,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
}
