package ai

import "context"

const (
	ProviderOpenAI     = "openai"
	ProviderGemini     = "gemini"
	ProviderDeepSeek   = "deepseek"
	ProviderOpenRouter = "openrouter"
	ProviderLocal      = "local"
)

var supportedProviders = map[string]struct{}{
	ProviderOpenAI:     {},
	ProviderGemini:     {},
	ProviderDeepSeek:   {},
	ProviderOpenRouter: {},
	ProviderLocal:      {},
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type CompletionRequest struct {
	Messages    []Message
	Temperature float64
	RequireJSON bool
}

type CompletionResponse struct {
	Text  string
	Model string
}

type Provider interface {
	Name() string
	Model() string
	IsConfigured() bool
	Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error)
}
