package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	response "edu-system/internal/delivery"
	"edu-system/internal/delivery/middleware"
)

func setupTestServer() *gin.Engine {
	gin.SetMode(gin.TestMode)

	server := response.NewServer()
	server.SetupMiddleware(middleware.CORS())
	server.SetupRoutes()

	return server.GetEngine()
}

func TestHealthEndpoint(t *testing.T) {
	app := setupTestServer()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
	if body := rec.Body.String(); !strings.Contains(body, "Server is running") {
		t.Fatalf("expected body to mention server status, got %q", body)
	}
}

func TestDebugEndpoint(t *testing.T) {
	app := setupTestServer()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/debug", nil)
	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
	if body := rec.Body.String(); !strings.Contains(body, "Debug endpoint working") {
		t.Fatalf("expected debug response, got %q", body)
	}
}

func TestCORSPreflight(t *testing.T) {
	app := setupTestServer()

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/tests", nil)
	req.Header.Set("Origin", "http://example.com")
	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, rec.Code)
	}
	if origin := rec.Header().Get("Access-Control-Allow-Origin"); origin != "http://example.com" {
		t.Fatalf("expected Access-Control-Allow-Origin header, got %q", origin)
	}
	if vary := rec.Header().Get("Vary"); vary != "Origin" {
		t.Fatalf("expected Vary header to be Origin, got %q", vary)
	}
}
