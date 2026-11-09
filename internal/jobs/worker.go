package jobs

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"travel-doodles/internal/platform/observability"
)

// WorkerPool manages concurrent execution of background jobs with strict resource bounds
type WorkerPool struct {
	queue        *Queue
	handlers     map[string]JobHandler
	concurrency  int
	pollInterval time.Duration
	metrics      *observability.Metrics
	wg           sync.WaitGroup
	stopCh       chan struct{}
}

func NewWorkerPool(queue *Queue, concurrency int, pollInterval time.Duration, metrics *observability.Metrics) *WorkerPool {
	if concurrency <= 0 {
		concurrency = 4
	}
	if pollInterval <= 0 {
		pollInterval = 1 * time.Second
	}
	return &WorkerPool{
		queue:        queue,
		handlers:     make(map[string]JobHandler),
		concurrency:  concurrency,
		pollInterval: pollInterval,
		metrics:      metrics,
		stopCh:       make(chan struct{}),
	}
}

// RegisterHandler binds a handler function to a specific job type
func (wp *WorkerPool) RegisterHandler(jobType string, handler JobHandler) {
	wp.handlers[jobType] = handler
}

// Start spawns the worker polling loop
func (wp *WorkerPool) Start(ctx context.Context) {
	slog.Info("starting background job worker pool",
		"concurrency", wp.concurrency,
		"poll_interval", wp.pollInterval,
	)

	wp.wg.Add(1)
	go wp.pollLoop(ctx)
}

// Stop initiates graceful worker shutdown and waits for running jobs to finish
func (wp *WorkerPool) Stop() {
	close(wp.stopCh)
	wp.wg.Wait()
	slog.Info("background job worker pool stopped cleanly")
}

func (wp *WorkerPool) pollLoop(ctx context.Context) {
	defer wp.wg.Done()
	ticker := time.NewTicker(wp.pollInterval)
	defer ticker.Stop()

	// Semaphore channel to enforce strict bounded concurrency
	sem := make(chan struct{}, wp.concurrency)

	for {
		select {
		case <-ctx.Done():
			return
		case <-wp.stopCh:
			return
		case <-ticker.C:
			// Update queue depth metric
			if wp.metrics != nil {
				if depth, err := wp.queue.GetQueueDepth(ctx); err == nil {
					wp.metrics.SetQueueDepth(depth)
				}
			}

			// Claim up to available slots
			availableSlots := wp.concurrency - len(sem)
			if availableSlots <= 0 {
				continue
			}

			jobs, err := wp.queue.ClaimJobs(ctx, availableSlots)
			if err != nil {
				slog.Error("failed to claim background jobs", "error", err)
				continue
			}

			for _, j := range jobs {
				sem <- struct{}{}
				wp.wg.Add(1)

				go func(job Job) {
					defer func() {
						<-sem
						wp.wg.Done()
					}()

					wp.processJob(ctx, job)
				}(j)
			}
		}
	}
}

func (wp *WorkerPool) processJob(ctx context.Context, job Job) {
	handler, exists := wp.handlers[job.JobType]
	if !exists {
		err := fmt.Errorf("no handler registered for job type '%s'", job.JobType)
		slog.Error("unhandled job type", "job_id", job.ID, "job_type", job.JobType)
		_ = wp.queue.MarkFailed(ctx, job.ID, job.Attempts, job.MaxAttempts, err)
		if wp.metrics != nil {
			wp.metrics.RecordJobProcessed(false)
		}
		return
	}

	start := time.Now()
	slog.Info("processing job", "job_id", job.ID, "type", job.JobType, "attempt", job.Attempts+1)

	// Execute with timeout
	jobCtx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()

	err := handler(jobCtx, job.Payload)
	duration := time.Since(start)

	if err != nil {
		slog.Error("job failed", "job_id", job.ID, "type", job.JobType, "error", err, "duration_ms", duration.Milliseconds())
		_ = wp.queue.MarkFailed(ctx, job.ID, job.Attempts, job.MaxAttempts, err)
		if wp.metrics != nil {
			wp.metrics.RecordJobProcessed(false)
		}
	} else {
		slog.Info("job completed successfully", "job_id", job.ID, "type", job.JobType, "duration_ms", duration.Milliseconds())
		_ = wp.queue.MarkCompleted(ctx, job.ID)
		if wp.metrics != nil {
			wp.metrics.RecordJobProcessed(true)
		}
	}
}
