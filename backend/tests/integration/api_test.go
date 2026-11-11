package integration

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"travel-doodles/internal/auth"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/comments"
	"travel-doodles/internal/feed"
	"travel-doodles/internal/friends"
	"travel-doodles/internal/geo"
	"travel-doodles/internal/media"
	"travel-doodles/internal/moderation"
	"travel-doodles/internal/notifications"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/middleware"
	"travel-doodles/internal/platform/observability"
	"travel-doodles/internal/platform/storage"
	"travel-doodles/internal/posts"
	"travel-doodles/internal/social"
	"travel-doodles/internal/users"
)

// setupTestRouter instantiates an in-memory test router without requiring live PostgreSQL
func setupTestRouter(t *testing.T) http.Handler {
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	tempDir, err := os.MkdirTemp("", "travel_api_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(tempDir) })

	store, err := storage.NewLocalStorage(tempDir, "http://localhost:8080/media/files", "test-secret-key-32-bytes-minimum-length")
	if err != nil {
		t.Fatalf("failed to create storage: %v", err)
	}

	memCache := cache.NewMemoryCache(100)
	metrics := observability.NewMetrics(100)
	rl := middleware.NewRateLimiter(60)

	sm := auth.NewSessionManager(nil, cfg)
	authHandler := auth.NewHandler(nil, sm, cfg, store)
	userHandler := users.NewHandler(users.NewService(nil, memCache, store))
	postHandler := posts.NewHandler(posts.NewService(nil, memCache, store))
	geoHandler := geo.NewHandler(geo.NewService(nil, memCache, store))
	socialHandler := social.NewHandler(social.NewService(nil, memCache))
	commentHandler := comments.NewHandler(comments.NewService(nil, store))
	feedHandler := feed.NewHandler(feed.NewService(nil, memCache, store))
	friendsHandler := friends.NewHandler(friends.NewService(nil, memCache, store, cfg))
	mediaHandler := media.NewHandler(media.NewService(nil, store), store)
	notifHandler := notifications.NewHandler(notifications.NewService(nil, store))
	modHandler := moderation.NewHandler(moderation.NewService(nil))

	r := chi.NewRouter()
	r.Use(middleware.RequestLogger(metrics))
	r.Use(middleware.Recoverer())
	r.Use(middleware.CORS(cfg))
	r.Use(middleware.BodyLimit(2 * 1024 * 1024))
	r.Use(middleware.RateLimitMiddleware(rl))
	r.Use(middleware.SessionAuth(sm))

	// Health and observability
	r.Get("/healthz", observability.HealthzHandler())
	r.Get("/metrics", metrics.Handler())

	// Media direct serve
	r.Get("/media/files/*", mediaHandler.HandleLocalServe)

	// API v1
	r.Route("/api/v1", func(api chi.Router) {
		api.Route("/auth", func(authR chi.Router) {
			authR.Post("/passwordless/register", authHandler.PasswordlessRegister)
			authR.Post("/passwordless/login", authHandler.PasswordlessLogin)
			authR.Post("/oauth", authHandler.OAuthLogin)
			authR.Post("/passkey/register/start", authHandler.PasskeyRegisterStart)
			authR.Post("/passkey/register/finish", authHandler.PasskeyRegisterFinish)
			authR.Post("/register", authHandler.Register)
			authR.Post("/login", authHandler.Login)
			authR.Post("/logout", authHandler.Logout)
			authR.Get("/me", authHandler.Me)
		})
		api.Route("/posts", func(postR chi.Router) {
			postR.Get("/map", geoHandler.GetMapPosts)
			postR.Get("/nearby", geoHandler.GetNearbyPosts)
			postR.With(middleware.RequireAuth()).Post("/", postHandler.CreatePost)
			postR.With(middleware.RequireAuth()).Post("/{id}/likes", socialHandler.Like)
			postR.Get("/{id}/comments", commentHandler.ListComments)
			postR.With(middleware.RequireAuth()).Post("/{id}/comments", commentHandler.CreateComment)
		})
		api.With(middleware.RequireAuth()).Get("/feed", feedHandler.GetFeed)
		api.Route("/users", func(userR chi.Router) {
			userR.Get("/{username}", userHandler.GetProfile)
			userR.With(middleware.RequireAuth()).Patch("/custom-id", userHandler.UpdateCustomID)
			userR.With(middleware.RequireAuth()).Post("/{id}/follow", socialHandler.Follow)
		})
		api.Route("/friends", func(friendR chi.Router) {
			friendR.Get("/invites/{code}", friendsHandler.GetInvite)
			friendR.With(middleware.RequireAuth()).Post("/add", friendsHandler.AddFriendByID)
			friendR.With(middleware.RequireAuth()).Post("/invites", friendsHandler.CreateInvite)
			friendR.With(middleware.RequireAuth()).Post("/invites/{code}/accept", friendsHandler.AcceptInvite)
			friendR.With(middleware.RequireAuth()).Get("/", friendsHandler.ListFriends)
			friendR.With(middleware.RequireAuth()).Delete("/{id}", friendsHandler.RemoveFriend)
		})
		api.Route("/reports", func(modR chi.Router) {
			modR.With(middleware.RequireAuth()).Post("/", modHandler.CreateReport)
		})
		api.Route("/notifications", func(notifR chi.Router) {
			notifR.With(middleware.RequireAuth()).Get("/", notifHandler.ListNotifications)
		})
	})

	return r
}

func TestHealthz(t *testing.T) {
	router := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"status":"ok"`) {
		t.Errorf("unexpected body: %s", rec.Body.String())
	}
}

func TestMetricsEndpoint(t *testing.T) {
	router := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "travel_requests_total") {
		t.Errorf("expected travel_requests_total metric in output")
	}
}

func TestPasswordAuth_DisabledResponse(t *testing.T) {
	router := setupTestRouter(t)

	// Password register should be rejected
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(`{"username":"alice","password":"password123"}`))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "password-based accounts are disabled") {
		t.Errorf("expected disabled message, got: %s", rec.Body.String())
	}

	// Password login should be rejected
	reqLogin := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", strings.NewReader(`{"login":"alice","password":"password123"}`))
	recLogin := httptest.NewRecorder()
	router.ServeHTTP(recLogin, reqLogin)

	if recLogin.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for login, got %d", recLogin.Code)
	}
	if !strings.Contains(recLogin.Body.String(), "password-based logins are disabled") {
		t.Errorf("expected disabled message, got: %s", recLogin.Body.String())
	}
}

func TestUnauthenticated_ProtectedRoutes(t *testing.T) {
	router := setupTestRouter(t)

	tests := []struct {
		name   string
		method string
		path   string
	}{
		{"feed", http.MethodGet, "/api/v1/feed"},
		{"create_post", http.MethodPost, "/api/v1/posts"},
		{"like_post", http.MethodPost, "/api/v1/posts/123/likes"},
		{"follow_user", http.MethodPost, "/api/v1/users/456/follow"},
		{"notifications", http.MethodGet, "/api/v1/notifications"},
		{"friends_list", http.MethodGet, "/api/v1/friends"},
		{"friends_add", http.MethodPost, "/api/v1/friends/add"},
		{"friends_invite", http.MethodPost, "/api/v1/friends/invites"},
		{"friends_accept", http.MethodPost, "/api/v1/friends/invites/code123/accept"},
		{"custom_id_update", http.MethodPatch, "/api/v1/users/custom-id"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusUnauthorized {
				t.Errorf("expected 401 Unauthorized for %s %s, got %d", tt.method, tt.path, rec.Code)
			}
		})
	}
}

func TestFriendInvite_PublicPreview_NotFound(t *testing.T) {
	router := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/friends/invites/nonexistent_code", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	// In-memory test without db returns 500 or 404
	if rec.Code == http.StatusOK {
		t.Fatalf("expected non-200 for nonexistent invite code, got %d", rec.Code)
	}
}

func TestMapDiscovery_Validation(t *testing.T) {
	router := setupTestRouter(t)

	// Missing bbox -> 400
	req := httptest.NewRequest(http.MethodGet, "/api/v1/posts/map", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for missing bbox, got %d", rec.Code)
	}

	// Malformed bbox -> 400
	reqBad := httptest.NewRequest(http.MethodGet, "/api/v1/posts/map?bbox=invalid", nil)
	recBad := httptest.NewRecorder()
	router.ServeHTTP(recBad, reqBad)

	if recBad.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for malformed bbox, got %d", recBad.Code)
	}
}

func TestMediaFiles_NotFound(t *testing.T) {
	router := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/media/files/nonexistent.jpg", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing media file, got %d", rec.Code)
	}
}

func TestCORS_Headers(t *testing.T) {
	router := setupTestRouter(t)

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/passwordless/register", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 for OPTIONS preflight, got %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") == "" {
		t.Errorf("expected Access-Control-Allow-Origin header")
	}
}

func TestBodyLimit_Exceeded(t *testing.T) {
	router := setupTestRouter(t)

	// Create payload larger than 2 MB
	hugePayload := bytes.Repeat([]byte("A"), 3*1024*1024)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/passwordless/register", bytes.NewReader(hugePayload))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code < 400 {
		t.Errorf("expected error status for body exceeding limit, got %d", rec.Code)
	}
}
