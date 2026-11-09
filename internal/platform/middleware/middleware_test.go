package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"travel-doodles/internal/auth"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/observability"
)

func TestRateLimiter(t *testing.T) {
	rl := NewRateLimiter(60) // 1 token per second, burst 60

	// Consume all 60
	for i := 0; i < 60; i++ {
		if !rl.Allow("test_client") {
			t.Fatalf("expected request %d to be allowed", i)
		}
	}

	// 61st request should be rejected immediately
	if rl.Allow("test_client") {
		t.Errorf("expected 61st request to exceed limit")
	}

	// Different client should still be allowed
	if !rl.Allow("other_client") {
		t.Errorf("expected other_client to be allowed")
	}
}

func TestRequireAuth(t *testing.T) {
	handler := RequireAuth()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Unauthenticated request -> 401
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}

	// Authenticated request -> 200
	authedReq := httptest.NewRequest(http.MethodGet, "/protected", nil)
	authedReq = authedReq.WithContext(auth.WithUser(authedReq.Context(), &auth.User{ID: "u1"}))
	authedRec := httptest.NewRecorder()
	handler.ServeHTTP(authedRec, authedReq)
	if authedRec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", authedRec.Code)
	}
}

func TestCORS(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "http://localhost:3000",
		Env:         "development",
	}

	handler := CORS(cfg)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/posts", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected 204 for preflight, got %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" {
		t.Errorf("unexpected origin header: %s", rec.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestRecoverer(t *testing.T) {
	handler := Recoverer()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something went critically wrong")
	}))

	req := httptest.NewRequest(http.MethodGet, "/panic", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", rec.Code)
	}
}

func TestRequestLogger(t *testing.T) {
	metrics := observability.NewMetrics(10)
	handler := RequestLogger(metrics)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Header().Get("X-Request-ID") == "" {
		t.Errorf("expected X-Request-ID header to be set")
	}
}
