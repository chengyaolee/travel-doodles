package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"travel-doodles/internal/jobs"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/database"
	"travel-doodles/internal/platform/observability"
	"travel-doodles/internal/platform/storage"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	logger := observability.InitLogger(cfg.Env)
	logger.Info("starting dedicated background worker", "concurrency", cfg.WorkerConcurrency)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.NewPool(ctx, cfg)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	store, err := storage.NewStorageService(cfg)
	if err != nil {
		logger.Error("storage initialization failed", "error", err)
		os.Exit(1)
	}

	metrics := observability.GlobalMetrics()
	jobQueue := jobs.NewQueue(pool)
	workerPool := jobs.NewWorkerPool(jobQueue, cfg.WorkerConcurrency, cfg.WorkerPollInterval, metrics)

	// Register job handlers
	workerPool.RegisterHandler("process_image", jobs.NewProcessImageHandler(pool, store))
	workerPool.RegisterHandler("cleanup_expired_uploads", jobs.NewCleanupExpiredUploadsHandler(pool, store))

	workerPool.Start(ctx)

	<-ctx.Done()
	logger.Info("shutting down background worker gracefully...")
	workerPool.Stop()
}
