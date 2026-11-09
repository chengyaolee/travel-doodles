package moderation

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrInvalidTargetType = errors.New("invalid target type; must be 'post', 'user', or 'comment'")
	ErrReasonRequired    = errors.New("report reason is required")
)

type Report struct {
	ID         string    `json:"id"`
	ReporterID string    `json:"reporter_id"`
	TargetType string    `json:"target_type"`
	TargetID   string    `json:"target_id"`
	Reason     string    `json:"reason"`
	Status     string    `json:"status"` // 'pending', 'reviewed', 'dismissed'
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) CreateReport(ctx context.Context, reporterID, targetType, targetID, reason string) (*Report, error) {
	targetType = strings.ToLower(strings.TrimSpace(targetType))
	if targetType != "post" && targetType != "user" && targetType != "comment" {
		return nil, ErrInvalidTargetType
	}

	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, ErrReasonRequired
	}

	query := `
		INSERT INTO reports (reporter_id, target_type, target_id, reason, status)
		VALUES ($1, $2, $3::uuid, $4, 'pending')
		RETURNING id, created_at, updated_at;
	`

	var rep Report
	rep.ReporterID = reporterID
	rep.TargetType = targetType
	rep.TargetID = targetID
	rep.Reason = reason
	rep.Status = "pending"

	err := s.pool.QueryRow(ctx, query, reporterID, targetType, targetID, reason).
		Scan(&rep.ID, &rep.CreatedAt, &rep.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}

	return &rep, nil
}

func (s *Service) ListReports(ctx context.Context, status string, limit int) ([]Report, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var query string
	var args []interface{}

	if status != "" {
		query = `
			SELECT id, reporter_id, target_type, target_id, reason, status, created_at, updated_at
			FROM reports
			WHERE status = $1
			ORDER BY created_at DESC
			LIMIT $2;
		`
		args = []interface{}{status, limit}
	} else {
		query = `
			SELECT id, reporter_id, target_type, target_id, reason, status, created_at, updated_at
			FROM reports
			ORDER BY created_at DESC
			LIMIT $1;
		`
		args = []interface{}{limit}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []Report
	for rows.Next() {
		var r Report
		if err := rows.Scan(&r.ID, &r.ReporterID, &r.TargetType, &r.TargetID, &r.Reason, &r.Status, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		reports = append(reports, r)
	}

	return reports, nil
}
