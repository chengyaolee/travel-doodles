package observability

import (
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

// Metrics holds lightweight, lock-free or minimal-overhead operational counters
type Metrics struct {
	mu sync.RWMutex

	// HTTP request metrics
	requestsTotal  atomic.Uint64
	errorsTotal    atomic.Uint64
	latenciesNano  []int64 // circular buffer or sampled slice for quantiles
	maxLatencySamp int
	latencyIdx     int

	// Cache metrics
	cacheHits   atomic.Uint64
	cacheMisses atomic.Uint64

	// Database metrics
	dbQueriesTotal atomic.Uint64
	dbErrorsTotal  atomic.Uint64

	// Worker queue metrics
	queueDepth atomic.Int64
	jobsTotal  atomic.Uint64
	jobsFailed atomic.Uint64

	startTime time.Time
}

var globalMetrics = NewMetrics(1000)

func GlobalMetrics() *Metrics {
	return globalMetrics
}

func NewMetrics(sampleCapacity int) *Metrics {
	if sampleCapacity <= 0 {
		sampleCapacity = 1000
	}
	return &Metrics{
		latenciesNano:  make([]int64, sampleCapacity),
		maxLatencySamp: sampleCapacity,
		startTime:      time.Now(),
	}
}

func (m *Metrics) RecordRequest(duration time.Duration, status int) {
	m.requestsTotal.Add(1)
	if status >= 400 {
		m.errorsTotal.Add(1)
	}

	nano := duration.Nanoseconds()
	m.mu.Lock()
	m.latenciesNano[m.latencyIdx] = nano
	m.latencyIdx = (m.latencyIdx + 1) % m.maxLatencySamp
	m.mu.Unlock()
}

func (m *Metrics) RecordCacheHit() {
	m.cacheHits.Add(1)
}

func (m *Metrics) RecordCacheMiss() {
	m.cacheMisses.Add(1)
}

func (m *Metrics) RecordDBQuery(err error) {
	m.dbQueriesTotal.Add(1)
	if err != nil {
		m.dbErrorsTotal.Add(1)
	}
}

func (m *Metrics) SetQueueDepth(depth int64) {
	m.queueDepth.Store(depth)
}

func (m *Metrics) RecordJobProcessed(success bool) {
	m.jobsTotal.Add(1)
	if !success {
		m.jobsFailed.Add(1)
	}
}

// Handler returns a standard Prometheus-formatted metrics HTTP handler
func (m *Metrics) Handler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var mem runtime.MemStats
		runtime.ReadMemStats(&mem)

		hits := m.cacheHits.Load()
		misses := m.cacheMisses.Load()
		totalCache := hits + misses
		var hitRatio float64
		if totalCache > 0 {
			hitRatio = float64(hits) / float64(totalCache)
		}

		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		fmt.Fprintf(w, "# HELP travel_requests_total Total number of HTTP requests processed\n")
		fmt.Fprintf(w, "# TYPE travel_requests_total counter\n")
		fmt.Fprintf(w, "travel_requests_total %d\n\n", m.requestsTotal.Load())

		fmt.Fprintf(w, "# HELP travel_errors_total Total number of HTTP 4xx/5xx errors\n")
		fmt.Fprintf(w, "# TYPE travel_errors_total counter\n")
		fmt.Fprintf(w, "travel_errors_total %d\n\n", m.errorsTotal.Load())

		fmt.Fprintf(w, "# HELP travel_cache_hit_ratio Proportion of cache hits\n")
		fmt.Fprintf(w, "# TYPE travel_cache_hit_ratio gauge\n")
		fmt.Fprintf(w, "travel_cache_hit_ratio %.4f\n\n", hitRatio)

		fmt.Fprintf(w, "# HELP travel_cache_hits_total Total cache hits\n")
		fmt.Fprintf(w, "# TYPE travel_cache_hits_total counter\n")
		fmt.Fprintf(w, "travel_cache_hits_total %d\n\n", hits)

		fmt.Fprintf(w, "# HELP travel_cache_misses_total Total cache misses\n")
		fmt.Fprintf(w, "# TYPE travel_cache_misses_total counter\n")
		fmt.Fprintf(w, "travel_cache_misses_total %d\n\n", misses)

		fmt.Fprintf(w, "# HELP travel_db_queries_total Total database queries executed\n")
		fmt.Fprintf(w, "# TYPE travel_db_queries_total counter\n")
		fmt.Fprintf(w, "travel_db_queries_total %d\n\n", m.dbQueriesTotal.Load())

		fmt.Fprintf(w, "# HELP travel_db_errors_total Total database query errors\n")
		fmt.Fprintf(w, "# TYPE travel_db_errors_total counter\n")
		fmt.Fprintf(w, "travel_db_errors_total %d\n\n", m.dbErrorsTotal.Load())

		fmt.Fprintf(w, "# HELP travel_worker_queue_depth Pending jobs in PostgreSQL queue\n")
		fmt.Fprintf(w, "# TYPE travel_worker_queue_depth gauge\n")
		fmt.Fprintf(w, "travel_worker_queue_depth %d\n\n", m.queueDepth.Load())

		fmt.Fprintf(w, "# HELP travel_jobs_total Total background jobs processed\n")
		fmt.Fprintf(w, "# TYPE travel_jobs_total counter\n")
		fmt.Fprintf(w, "travel_jobs_total %d\n\n", m.jobsTotal.Load())

		fmt.Fprintf(w, "# HELP travel_process_memory_alloc_bytes Bytes allocated and still in use\n")
		fmt.Fprintf(w, "# TYPE travel_process_memory_alloc_bytes gauge\n")
		fmt.Fprintf(w, "travel_process_memory_alloc_bytes %d\n\n", mem.Alloc)

		fmt.Fprintf(w, "# HELP travel_process_memory_sys_bytes Total bytes of memory obtained from OS\n")
		fmt.Fprintf(w, "# TYPE travel_process_memory_sys_bytes gauge\n")
		fmt.Fprintf(w, "travel_process_memory_sys_bytes %d\n\n", mem.Sys)

		fmt.Fprintf(w, "# HELP travel_process_goroutines Active goroutines\n")
		fmt.Fprintf(w, "# TYPE travel_process_goroutines gauge\n")
		fmt.Fprintf(w, "travel_process_goroutines %d\n\n", runtime.NumGoroutine())

		fmt.Fprintf(w, "# HELP travel_process_uptime_seconds Process uptime\n")
		fmt.Fprintf(w, "# TYPE travel_process_uptime_seconds gauge\n")
		fmt.Fprintf(w, "travel_process_uptime_seconds %.0f\n", time.Since(m.startTime).Seconds())
	}
}

// HealthzHandler returns 200 OK for basic liveness check
func HealthzHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}
}

// ReadyCheckFn checks the readiness of a dependency (e.g., PostgreSQL or Redis)
type ReadyCheckFn func() error

// ReadyzHandler returns 200 OK if all critical readiness checks pass
func ReadyzHandler(checks map[string]ReadyCheckFn) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		failures := make(map[string]string)
		for name, check := range checks {
			if check != nil {
				if err := check(); err != nil {
					failures[name] = err.Error()
				}
			}
		}

		if len(failures) > 0 {
			w.WriteHeader(http.StatusServiceUnavailable)
			resp := fmt.Sprintf(`{"status":"degraded","failures":%d}`, len(failures))
			_, _ = w.Write([]byte(resp))
			return
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ready"}`))
	}
}
