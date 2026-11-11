package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/geo"
	"travel-doodles/internal/platform/middleware"
	"travel-doodles/internal/platform/observability"
	"travel-doodles/internal/platform/storage"
)

func TestLoadBenchmark_InProcess(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "loadtest_*")
	defer os.RemoveAll(tempDir)

	store, _ := storage.NewLocalStorage(tempDir, "http://localhost:8080/media/files", "secret")
	memCache := cache.NewMemoryCache(1000)
	metrics := observability.NewMetrics(1000)

	tile := geo.TileCoord{Zoom: 6, X: 32, Y: 21}
	tileKey := cache.GeoTileKey(tile.Zoom, tile.X, tile.Y, "public")
	_ = memCache.Set(t.Context(), tileKey, []byte(`{"zoom":6,"clusters":[{"id":"cl_1","latitude":48.8,"longitude":2.3,"count":12}],"markers":[]}`), 5*time.Minute)

	tileBBox := geo.TileToBBox(tile)
	// Query box strictly inside tile bounds so BBoxToTiles returns exactly [tile]
	insideBBox := fmt.Sprintf("%f,%f,%f,%f", tileBBox.MinLon+0.1, tileBBox.MinLat+0.1, tileBBox.MaxLon-0.1, tileBBox.MaxLat-0.1)

	geoHandler := geo.NewHandler(geo.NewService(nil, memCache, store))

	r := chi.NewRouter()
	r.Use(middleware.RequestLogger(metrics))

	r.Get("/healthz", observability.HealthzHandler())
	r.Get("/metrics", metrics.Handler())
	r.Get("/api/v1/posts/map", geoHandler.GetMapPosts)

	stats := &BenchmarkStats{
		Durations: make([]time.Duration, 0, 5000),
	}

	concurrency := 10
	totalRequests := 1000
	requestsPerWorker := totalRequests / concurrency

	var wg sync.WaitGroup
	start := time.Now()

	for w := 0; w < concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			localDurations := make([]time.Duration, 0, requestsPerWorker)

			for i := 0; i < requestsPerWorker; i++ {
				var req *http.Request
				if i%2 == 0 {
					// Cached map discovery query: inside tile (z6, x32, y21)
					req = httptest.NewRequest(http.MethodGet, "/api/v1/posts/map?bbox="+insideBBox+"&zoom=6", nil)
				} else {
					req = httptest.NewRequest(http.MethodGet, "/healthz", nil)
				}

				rec := httptest.NewRecorder()
				reqStart := time.Now()
				r.ServeHTTP(rec, req)
				dur := time.Since(reqStart)

				atomic.AddUint64(&stats.TotalRequests, 1)
				if rec.Code == http.StatusOK {
					atomic.AddUint64(&stats.SuccessCount, 1)
					localDurations = append(localDurations, dur)
				} else {
					atomic.AddUint64(&stats.ErrorCount, 1)
				}
			}

			stats.Mu.Lock()
			stats.Durations = append(stats.Durations, localDurations...)
			stats.Mu.Unlock()
		}()
	}

	wg.Wait()
	elapsed := time.Since(start)

	PrintReport(stats, elapsed)

	if atomic.LoadUint64(&stats.SuccessCount) != uint64(totalRequests) {
		t.Errorf("expected %d successful requests, got %d", totalRequests, stats.SuccessCount)
	}
}
