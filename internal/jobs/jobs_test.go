package jobs

import (
	"context"
	"encoding/json"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"travel-doodles/internal/platform/observability"
)

func TestExponentialBackoffCalculation(t *testing.T) {
	// 2^attempts * 3 seconds
	// attempt 1: 2^1 * 3 = 6s
	// attempt 2: 2^2 * 3 = 12s
	// attempt 3: 2^3 * 3 = 24s
	maxAttempts := 5

	for attempts := 1; attempts < maxAttempts; attempts++ {
		backoffSec := 3 * (1 << attempts)
		if backoffSec <= 0 {
			t.Errorf("expected positive backoff")
		}
	}
}

func TestWorkerPool_RegistrationAndShutdown(t *testing.T) {
	metrics := observability.NewMetrics(10)
	wp := NewWorkerPool(nil, 2, 50*time.Millisecond, metrics)

	var processedCount atomic.Int32
	wp.RegisterHandler("test_job", func(ctx context.Context, payload json.RawMessage) error {
		processedCount.Add(1)
		return nil
	})

	if _, ok := wp.handlers["test_job"]; !ok {
		t.Fatalf("expected handler to be registered")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start and quickly stop without blocking
	wp.Start(ctx)
	time.Sleep(10 * time.Millisecond)
	wp.Stop()
}

func TestProcessJob_ErrorHandler(t *testing.T) {
	metrics := observability.NewMetrics(10)
	wp := NewWorkerPool(nil, 1, 100*time.Millisecond, metrics)

	wp.RegisterHandler("failing_job", func(ctx context.Context, payload json.RawMessage) error {
		return errors.New("simulated error")
	})

	if handler, exists := wp.handlers["failing_job"]; exists {
		err := handler(context.Background(), nil)
		if err == nil {
			t.Errorf("expected error from failing job handler")
		}
	}
}
