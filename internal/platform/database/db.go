package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/observability"
)

// NewPool initializes a PostgreSQL connection pool configured for a low-cost VPS
func NewPool(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database url: %w", err)
	}

	// Conservative resource limits for 2 vCPU / 4 GB RAM VPS
	poolConfig.MaxConns = cfg.DBMaxConns
	if poolConfig.MaxConns <= 0 {
		poolConfig.MaxConns = 25
	}
	poolConfig.MinConns = cfg.DBMinConns
	if poolConfig.MinConns <= 0 {
		poolConfig.MinConns = 5
	}
	poolConfig.MaxConnIdleTime = time.Duration(cfg.DBMaxIdleTimeMinutes) * time.Minute
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	// Connect with timeout
	connectCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(connectCtx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Verify connection
	if err := pool.Ping(connectCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	slog.Info("connected to postgresql successfully",
		"max_conns", poolConfig.MaxConns,
		"min_conns", poolConfig.MinConns,
		"url", cfg.RedactedDatabaseURL(),
	)

	return pool, nil
}

// PingCheck returns a ReadyCheckFn for observability readiness probes
func PingCheck(pool *pgxpool.Pool) observability.ReadyCheckFn {
	return func() error {
		if pool == nil {
			return fmt.Errorf("database pool is nil")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		return pool.Ping(ctx)
	}
}
