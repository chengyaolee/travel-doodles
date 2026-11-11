package observability

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestMetrics_RecordAndExport(t *testing.T) {
	m := NewMetrics(50)
	m.RecordRequest(12*time.Millisecond, 200)
	m.RecordRequest(35*time.Millisecond, 500)
	m.RecordCacheHit()
	m.RecordCacheMiss()
	m.RecordDBQuery(nil)
	m.RecordDBQuery(errors.New("db timeout"))
	m.SetQueueDepth(4)
	m.RecordJobProcessed(true)
	m.RecordJobProcessed(false)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	m.Handler()(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	body := rec.Body.String()
	if !strings.Contains(body, "travel_requests_total 2") {
		t.Errorf("expected travel_requests_total 2, got:\n%s", body)
	}
	if !strings.Contains(body, "travel_errors_total 1") {
		t.Errorf("expected travel_errors_total 1, got:\n%s", body)
	}
	if !strings.Contains(body, "travel_cache_hit_ratio 0.5000") {
		t.Errorf("expected cache hit ratio 0.5000, got:\n%s", body)
	}
	if !strings.Contains(body, "travel_worker_queue_depth 4") {
		t.Errorf("expected queue depth 4, got:\n%s", body)
	}
}

func TestReadyzHandler(t *testing.T) {
	checksSuccess := map[string]ReadyCheckFn{
		"db": func() error { return nil },
	}
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()
	ReadyzHandler(checksSuccess)(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for ready checks, got %d", rec.Code)
	}

	checksFailed := map[string]ReadyCheckFn{
		"db": func() error { return errors.New("db unreachable") },
	}
	recFailed := httptest.NewRecorder()
	ReadyzHandler(checksFailed)(recFailed, req)
	if recFailed.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 for failed ready checks, got %d", recFailed.Code)
	}
}
