package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Job struct {
	ID          string          `json:"id"`
	JobType     string          `json:"job_type"`
	Payload     json.RawMessage `json:"payload"`
	Status      string          `json:"status"` // 'pending', 'processing', 'completed', 'failed'
	Attempts    int             `json:"attempts"`
	MaxAttempts int             `json:"max_attempts"`
	RunAt       time.Time       `json:"run_at"`
	LastError   *string         `json:"last_error,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type JobHandler func(ctx context.Context, payload json.RawMessage) error

type Queue struct {
	pool *pgxpool.Pool
}

func NewQueue(pool *pgxpool.Pool) *Queue {
	return &Queue{pool: pool}
}

// Enqueue inserts a new durable job into the PostgreSQL queue
func (q *Queue) Enqueue(ctx context.Context, jobType string, payload interface{}, runAt time.Time) (string, error) {
	bytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal job payload: %w", err)
	}

	if runAt.IsZero() {
		runAt = time.Now()
	}

	query := `
		INSERT INTO jobs (job_type, payload, status, run_at)
		VALUES ($1, $2, 'pending', $3)
		RETURNING id;
	`
	var jobID string
	err = q.pool.QueryRow(ctx, query, jobType, bytes, runAt).Scan(&jobID)
	return jobID, err
}

// ClaimJobs atomically claims up to limit pending runnable jobs using FOR UPDATE SKIP LOCKED
func (q *Queue) ClaimJobs(ctx context.Context, limit int) ([]Job, error) {
	if limit <= 0 {
		limit = 1
	}

	query := `
		WITH claimable AS (
			SELECT id
			FROM jobs
			WHERE status = 'pending' AND run_at <= NOW()
			ORDER BY run_at ASC
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE jobs j
		SET status = 'processing', updated_at = NOW()
		FROM claimable c
		WHERE j.id = c.id
		RETURNING j.id, j.job_type, j.payload, j.status, j.attempts, j.max_attempts, j.run_at, j.created_at, j.updated_at;
	`

	rows, err := q.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to claim jobs: %w", err)
	}
	defer rows.Close()

	var claimed []Job
	for rows.Next() {
		var j Job
		err := rows.Scan(
			&j.ID,
			&j.JobType,
			&j.Payload,
			&j.Status,
			&j.Attempts,
			&j.MaxAttempts,
			&j.RunAt,
			&j.CreatedAt,
			&j.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		claimed = append(claimed, j)
	}

	return claimed, nil
}

// MarkCompleted sets job status to 'completed'
func (q *Queue) MarkCompleted(ctx context.Context, jobID string) error {
	query := `UPDATE jobs SET status = 'completed', updated_at = NOW() WHERE id = $1;`
	_, err := q.pool.Exec(ctx, query, jobID)
	return err
}

// MarkFailed records an error and schedules exponential backoff or dead-letter failure
func (q *Queue) MarkFailed(ctx context.Context, jobID string, attempts, maxAttempts int, jobErr error) error {
	newAttempts := attempts + 1
	errStr := jobErr.Error()

	if newAttempts >= maxAttempts {
		// Move to Dead-Letter Status
		query := `
			UPDATE jobs
			SET status = 'failed', attempts = $2, last_error = $3, updated_at = NOW()
			WHERE id = $1;
		`
		_, err := q.pool.Exec(ctx, query, jobID, newAttempts, errStr)
		return err
	}

	// Calculate exponential backoff: 2^(attempts) * 3 seconds
	backoffSec := math.Pow(2, float64(newAttempts)) * 3.0
	if backoffSec > 3600 {
		backoffSec = 3600 // Cap at 1 hour
	}
	nextRunAt := time.Now().Add(time.Duration(backoffSec) * time.Second)

	query := `
		UPDATE jobs
		SET status = 'pending', attempts = $2, run_at = $3, last_error = $4, updated_at = NOW()
		WHERE id = $1;
	`
	_, err := q.pool.Exec(ctx, query, jobID, newAttempts, nextRunAt, errStr)
	return err
}

// GetQueueDepth returns the count of pending and processing jobs for metrics
func (q *Queue) GetQueueDepth(ctx context.Context) (int64, error) {
	query := `SELECT COUNT(*) FROM jobs WHERE status IN ('pending', 'processing');`
	var count int64
	err := q.pool.QueryRow(ctx, query).Scan(&count)
	return count, err
}
