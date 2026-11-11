package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"travel-doodles/internal/auth"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/observability"
)

// ResponseWriterWrapper intercepts the status code for logging and metrics
type responseWriterWrapper struct {
	http.ResponseWriter
	statusCode int
	bytes      int
}

func (rw *responseWriterWrapper) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriterWrapper) Write(b []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.bytes += n
	return n, err
}

// RequestLogger logs incoming HTTP requests and updates Prometheus metrics
func RequestLogger(metrics *observability.Metrics) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			reqID := r.Header.Get("X-Request-ID")
			if reqID == "" {
				b := make([]byte, 8)
				_, _ = rand.Read(b)
				reqID = hex.EncodeToString(b)
			}
			w.Header().Set("X-Request-ID", reqID)

			ctx := observability.WithRequestID(r.Context(), reqID)
			rw := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(rw, r.WithContext(ctx))

			duration := time.Since(start)
			if metrics != nil {
				metrics.RecordRequest(duration, rw.statusCode)
			}

			observability.FromContext(ctx).Info("http request completed",
				"method", r.Method,
				"path", r.URL.Path,
				"status", rw.statusCode,
				"bytes", rw.bytes,
				"duration_ms", duration.Milliseconds(),
				"remote_addr", r.RemoteAddr,
			)
		})
	}
}

// Recoverer catches unhandled panics and outputs a structured 500 error
func Recoverer() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					observability.FromContext(r.Context()).Error("recovered from panic in HTTP handler", "panic", rec)
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_ = json.NewEncoder(w).Encode(map[string]string{
						"error": "internal server error",
					})
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// CORS handles Cross-Origin Resource Sharing for the Next.js frontend
func CORS(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && (origin == cfg.FrontendURL || cfg.Env == "development") {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-ID")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// BodyLimit restricts incoming payload size to prevent memory exhaustion
func BodyLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// SessionAuth extracts the session cookie or Bearer token and resolves the user
func SessionAuth(sm *auth.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var rawToken string

			// 1. Check HttpOnly cookie
			cookie, err := r.Cookie(sm.CookieName())
			if err == nil && cookie.Value != "" {
				rawToken = cookie.Value
			}

			// 2. Check Authorization Bearer header fallback
			if rawToken == "" {
				authHeader := r.Header.Get("Authorization")
				if strings.HasPrefix(authHeader, "Bearer ") {
					rawToken = strings.TrimPrefix(authHeader, "Bearer ")
				}
			}

			if rawToken != "" {
				user, err := sm.ValidateSessionToken(r.Context(), rawToken)
				if err == nil && user != nil {
					r = r.WithContext(auth.WithUser(r.Context(), user))
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireAuth blocks unauthenticated requests with 401 Unauthorized
func RequireAuth() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := auth.UserFromContext(r.Context())
			if user == nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "authentication required",
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// In-Memory Rate Limiter for robust protection with zero external setup
type rateBucket struct {
	tokens     float64
	lastRefill time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*rateBucket
	rate    float64 // tokens per second
	burst   float64
}

func NewRateLimiter(requestsPerMinute int) *RateLimiter {
	rate := float64(requestsPerMinute) / 60.0
	return &RateLimiter{
		buckets: make(map[string]*rateBucket),
		rate:    rate,
		burst:   float64(requestsPerMinute),
	}
}

func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, exists := rl.buckets[key]
	if !exists {
		rl.buckets[key] = &rateBucket{
			tokens:     rl.burst - 1.0,
			lastRefill: now,
		}
		return true
	}

	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens = b.tokens + elapsed*rl.rate
	if b.tokens > rl.burst {
		b.tokens = rl.burst
	}
	b.lastRefill = now

	if b.tokens >= 1.0 {
		b.tokens -= 1.0
		return true
	}
	return false
}

// CleanUp cleans old expired buckets periodically
func (rl *RateLimiter) CleanUp(maxAge time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	for k, b := range rl.buckets {
		if now.Sub(b.lastRefill) > maxAge {
			delete(rl.buckets, k)
		}
	}
}

// RateLimitMiddleware applies rate limiting per client IP / Identity
func RateLimitMiddleware(limiter *RateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if limiter == nil {
				next.ServeHTTP(w, r)
				return
			}

			ip := r.RemoteAddr
			xf := r.Header.Get("X-Forwarded-For")
			if xf != "" {
				ip = strings.Split(xf, ",")[0]
			}

			if !limiter.Allow(strings.TrimSpace(ip)) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "rate limit exceeded, please retry later",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
