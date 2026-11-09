package database

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RunMigrations applies pending SQL migrations in alphabetical order
func RunMigrations(ctx context.Context, pool *pgxpool.Pool, migrationsDir string) error {
	// 1. Ensure migrations tracking table exists
	initQuery := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);`
	if _, err := pool.Exec(ctx, initQuery); err != nil {
		return fmt.Errorf("failed to create schema_migrations table: %w", err)
	}

	// 2. Read migration files
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory '%s': %w", migrationsDir, err)
	}

	var upFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			upFiles = append(upFiles, entry.Name())
		}
	}
	sort.Strings(upFiles)

	for _, filename := range upFiles {
		version := strings.TrimSuffix(filename, ".up.sql")

		var exists bool
		checkQuery := `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1);`
		if err := pool.QueryRow(ctx, checkQuery, version).Scan(&exists); err != nil {
			return fmt.Errorf("failed to check migration status for %s: %w", version, err)
		}

		if exists {
			continue // Already applied
		}

		slog.Info("applying database migration", "version", version)

		content, err := os.ReadFile(filepath.Join(migrationsDir, filename))
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", filename, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to begin transaction for migration %s: %w", version, err)
		}

		if _, err := tx.Exec(ctx, string(content)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("migration %s failed to execute: %w", version, err)
		}

		recordQuery := `INSERT INTO schema_migrations (version) VALUES ($1);`
		if _, err := tx.Exec(ctx, recordQuery, version); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("failed to record migration %s: %w", version, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", version, err)
		}

		slog.Info("database migration applied successfully", "version", version)
	}

	return nil
}
