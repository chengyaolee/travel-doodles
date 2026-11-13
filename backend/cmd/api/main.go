package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/auth"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/comments"
	"travel-doodles/internal/feed"
	"travel-doodles/internal/friends"
	"travel-doodles/internal/geo"
	"travel-doodles/internal/jobs"
	"travel-doodles/internal/media"
	"travel-doodles/internal/moderation"
	"travel-doodles/internal/notifications"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/database"
	"travel-doodles/internal/platform/middleware"
	"travel-doodles/internal/platform/observability"
	"travel-doodles/internal/platform/storage"
	"travel-doodles/internal/posts"
	"travel-doodles/internal/social"
	"travel-doodles/internal/users"
)

type Application struct {
	Config      *config.Config
	Pool        *pgxpool.Pool
	Cache       cache.CacheService
	Storage     storage.StorageService
	Metrics     *observability.Metrics
	RateLimiter *middleware.RateLimiter
	WorkerPool  *jobs.WorkerPool

	AuthHandler         *auth.Handler
	UserHandler         *users.Handler
	PostHandler         *posts.Handler
	GeoHandler          *geo.Handler
	SocialHandler       *social.Handler
	CommentHandler      *comments.Handler
	FeedHandler         *feed.Handler
	FriendHandler       *friends.Handler
	MediaHandler        *media.Handler
	NotificationHandler *notifications.Handler
	ModerationHandler   *moderation.Handler
	SessionManager      *auth.SessionManager
}

func main() {
	// 1. Load Configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// 2. Initialize Structured Logger
	logger := observability.InitLogger(cfg.Env)
	logger.Info("starting travel-doodles backend", "env", cfg.Env, "port", cfg.Port)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 3. Initialize Metrics Collector
	metrics := observability.GlobalMetrics()

	// 4. Initialize Database Pool
	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// 5. Apply Database Migrations automatically on startup
	candidateMigrationDirs := []string{
		"./db/migrations",
		"./backend/db/migrations",
		"../backend/db/migrations",
		"../db/migrations",
		"/app/db/migrations",
	}
	migrationsApplied := false
	for _, mDir := range candidateMigrationDirs {
		if _, err := os.Stat(mDir); err == nil {
			if err := database.RunMigrations(ctx, pool, mDir); err != nil {
				logger.Warn("auto-migration warning", "dir", mDir, "error", err)
			} else {
				logger.Info("database migrations verified", "dir", mDir)
			}
			migrationsApplied = true
			break
		}
	}
	if !migrationsApplied {
		logger.Warn("migrations directory not found in standard paths")
	}

	// 6. Initialize Storage Service
	store, err := storage.NewStorageService(cfg)
	if err != nil {
		logger.Error("storage initialization failed", "error", err)
		os.Exit(1)
	}

	// 7. Initialize Resilient Cache
	cacheService := cache.NewCache(cfg, metrics)
	defer cacheService.Close()

	// 8. Initialize In-Process Worker Pool (can also run as dedicated worker process)
	jobQueue := jobs.NewQueue(pool)
	workerPool := jobs.NewWorkerPool(jobQueue, cfg.WorkerConcurrency, cfg.WorkerPollInterval, metrics)
	workerPool.RegisterHandler("process_image", jobs.NewProcessImageHandler(pool, store))
	workerPool.RegisterHandler("cleanup_expired_uploads", jobs.NewCleanupExpiredUploadsHandler(pool, store))
	workerPool.Start(ctx)
	defer workerPool.Stop()

	// 9. Initialize Domain Services & Handlers
	sm := auth.NewSessionManager(pool, cfg)
	authHandler := auth.NewHandler(pool, sm, cfg, store)

	userService := users.NewService(pool, cacheService, store)
	userHandler := users.NewHandler(userService)

	postService := posts.NewService(pool, cacheService, store)
	postHandler := posts.NewHandler(postService)

	geoService := geo.NewService(pool, cacheService, store)
	geoHandler := geo.NewHandler(geoService)

	socialService := social.NewService(pool, cacheService)
	socialHandler := social.NewHandler(socialService)

	commentService := comments.NewService(pool, store)
	commentHandler := comments.NewHandler(commentService)

	feedService := feed.NewService(pool, cacheService, store)
	feedHandler := feed.NewHandler(feedService)

	friendsService := friends.NewService(pool, cacheService, store, cfg)
	friendsHandler := friends.NewHandler(friendsService)

	mediaService := media.NewService(pool, store)
	mediaHandler := media.NewHandler(mediaService, store)

	notifService := notifications.NewService(pool, store)
	notifHandler := notifications.NewHandler(notifService)

	modService := moderation.NewService(pool)
	modHandler := moderation.NewHandler(modService)

	app := &Application{
		Config:              cfg,
		Pool:                pool,
		Cache:               cacheService,
		Storage:             store,
		Metrics:             metrics,
		RateLimiter:         middleware.NewRateLimiter(cfg.RateLimitRequestsPerMinute),
		WorkerPool:          workerPool,
		AuthHandler:         authHandler,
		UserHandler:         userHandler,
		PostHandler:         postHandler,
		GeoHandler:          geoHandler,
		SocialHandler:       socialHandler,
		CommentHandler:      commentHandler,
		FeedHandler:         feedHandler,
		FriendHandler:       friendsHandler,
		MediaHandler:        mediaHandler,
		NotificationHandler: notifHandler,
		ModerationHandler:   modHandler,
		SessionManager:      sm,
	}

	router := app.BuildRouter()

	// 10. HTTP Server with graceful shutdown
	server := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20, // 1 MB
	}

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("HTTP server listening", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	select {
	case err := <-serverErr:
		logger.Error("HTTP server failed", "error", err)
	case <-ctx.Done():
		logger.Info("shutting down HTTP server gracefully...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("server shutdown error", "error", err)
		}
	}
}

// BuildRouter constructs and registers all HTTP endpoints and middlewares
func (app *Application) BuildRouter() http.Handler {
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(middleware.RequestLogger(app.Metrics))
	r.Use(middleware.Recoverer())
	r.Use(middleware.CORS(app.Config))
	r.Use(middleware.BodyLimit(20 * 1024 * 1024)) // 20 MB limit for JSON bodies with image data
	if app.Config.RateLimitEnabled {
		r.Use(middleware.RateLimitMiddleware(app.RateLimiter))
	}
	r.Use(middleware.SessionAuth(app.SessionManager))

	// Liveness, Readiness, and Observability Metrics
	r.Get("/healthz", observability.HealthzHandler())
	r.Get("/readyz", observability.ReadyzHandler(map[string]observability.ReadyCheckFn{
		"database": database.PingCheck(app.Pool),
	}))
	r.Get("/metrics", app.Metrics.Handler())

	// Local Media Serving & Upload routes (if LocalStorage is used)
	r.Put("/media/files/upload", app.MediaHandler.HandleLocalUpload)
	r.Get("/media/files/*", app.MediaHandler.HandleLocalServe)

	// API v1 Subrouter
	r.Route("/api/v1", func(api chi.Router) {
		// Auth Endpoints (Passwordless)
		api.Route("/auth", func(authR chi.Router) {
			// Passwordless Instant Registration & Login
			authR.Post("/passwordless/register", app.AuthHandler.PasswordlessRegister)
			authR.Post("/passwordless/login", app.AuthHandler.PasswordlessLogin)
			authR.Post("/oauth", app.AuthHandler.OAuthLogin)

			// WebAuthn / Passkeys
			authR.Post("/passkey/register/start", app.AuthHandler.PasskeyRegisterStart)
			authR.Post("/passkey/register/finish", app.AuthHandler.PasskeyRegisterFinish)
			authR.Post("/passkey/login/start", app.AuthHandler.PasskeyLoginStart)
			authR.Post("/passkey/login/finish", app.AuthHandler.PasskeyLoginFinish)

			// Legacy password endpoints disabled
			authR.Post("/register", app.AuthHandler.Register)
			authR.Post("/login", app.AuthHandler.Login)

			authR.Post("/logout", app.AuthHandler.Logout)
			authR.Get("/me", app.AuthHandler.Me)
		})

		// Users & Profiles
		api.Route("/users", func(userR chi.Router) {
			userR.Get("/{username}", app.UserHandler.GetProfile)
			userR.With(middleware.RequireAuth()).Patch("/custom-id", app.UserHandler.UpdateCustomID)
			userR.With(middleware.RequireAuth()).Patch("/{username}", app.UserHandler.UpdateProfile)

			// Follow / Unfollow / Block
			userR.With(middleware.RequireAuth()).Post("/{id}/follow", app.SocialHandler.Follow)
			userR.With(middleware.RequireAuth()).Delete("/{id}/follow", app.SocialHandler.Unfollow)
			userR.With(middleware.RequireAuth()).Post("/{id}/block", app.SocialHandler.Block)
			userR.With(middleware.RequireAuth()).Delete("/{id}/block", app.SocialHandler.Unblock)
		})

		// Friend System (Add by Custom ID, Requests & Accept, Send 3-Day Invite Links)
		api.Route("/friends", func(friendR chi.Router) {
			// Public invite link preview (inspects 3-day TTL)
			friendR.Get("/invites/{code}", app.FriendHandler.GetInvite)

			// Search travelers by ID or display name
			friendR.Get("/search", app.FriendHandler.SearchUsers)

			// Authenticated friend actions
			friendR.With(middleware.RequireAuth()).Post("/add", app.FriendHandler.AddFriendByID)
			friendR.With(middleware.RequireAuth()).Post("/invites", app.FriendHandler.CreateInvite)
			friendR.With(middleware.RequireAuth()).Post("/invites/{code}/accept", app.FriendHandler.AcceptInvite)
			friendR.With(middleware.RequireAuth()).Get("/", app.FriendHandler.ListFriends)
			friendR.With(middleware.RequireAuth()).Delete("/{id}", app.FriendHandler.RemoveFriend)

			// Friend Requests Workflow (Search -> Request -> Confirm/Accept)
			friendR.With(middleware.RequireAuth()).Get("/requests", app.FriendHandler.ListFriendRequests)
			friendR.With(middleware.RequireAuth()).Post("/requests", app.FriendHandler.SendFriendRequest)
			friendR.With(middleware.RequireAuth()).Post("/requests/{id}/accept", app.FriendHandler.AcceptFriendRequest)
			friendR.With(middleware.RequireAuth()).Post("/requests/{id}/decline", app.FriendHandler.DeclineFriendRequest)
			friendR.With(middleware.RequireAuth()).Delete("/requests/{id}", app.FriendHandler.CancelFriendRequest)
		})

		// Posts & Geographic Discovery
		api.Route("/posts", func(postR chi.Router) {
			postR.Get("/", app.PostHandler.ListPosts)
			postR.With(middleware.RequireAuth()).Post("/", app.PostHandler.CreatePost)

			// Map & Nearby
			postR.Get("/map", app.GeoHandler.GetMapPosts)
			postR.Get("/nearby", app.GeoHandler.GetNearbyPosts)

			// Post Detail, Edit, Soft Delete
			postR.Get("/{id}", app.PostHandler.GetPost)
			postR.With(middleware.RequireAuth()).Patch("/{id}", app.PostHandler.UpdatePost)
			postR.With(middleware.RequireAuth()).Delete("/{id}", app.PostHandler.DeletePost)

			// Likes
			postR.With(middleware.RequireAuth()).Post("/{id}/likes", app.SocialHandler.Like)
			postR.With(middleware.RequireAuth()).Delete("/{id}/likes", app.SocialHandler.Unlike)

			// Comments
			postR.Get("/{id}/comments", app.CommentHandler.ListComments)
			postR.With(middleware.RequireAuth()).Post("/{id}/comments", app.CommentHandler.CreateComment)
		})

		// Comments Delete
		api.With(middleware.RequireAuth()).Delete("/comments/{id}", app.CommentHandler.DeleteComment)

		// Friends Feed (Fan-out-on-read)
		api.With(middleware.RequireAuth()).Get("/feed", app.FeedHandler.GetFeed)

		// Media Upload Pipeline
		api.Route("/media", func(mediaR chi.Router) {
			mediaR.With(middleware.RequireAuth()).Post("/uploads", app.MediaHandler.RequestUpload)
			mediaR.With(middleware.RequireAuth()).Post("/uploads/{id}/complete", app.MediaHandler.CompleteUpload)
		})

		// Notifications
		api.Route("/notifications", func(notifR chi.Router) {
			notifR.With(middleware.RequireAuth()).Get("/", app.NotificationHandler.ListNotifications)
			notifR.With(middleware.RequireAuth()).Patch("/{id}/read", app.NotificationHandler.MarkRead)
			notifR.With(middleware.RequireAuth()).Post("/read-all", app.NotificationHandler.MarkAllRead)
		})

		// Content Reports & Moderation
		api.Route("/reports", func(modR chi.Router) {
			modR.With(middleware.RequireAuth()).Post("/", app.ModerationHandler.CreateReport)
			modR.With(middleware.RequireAuth()).Get("/", app.ModerationHandler.ListReports)
		})
	})

	return r
}
