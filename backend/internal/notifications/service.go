package notifications

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/platform/storage"
)

var (
	ErrNotificationNotFound = errors.New("notification not found")
)

type NotificationActor struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

type Notification struct {
	ID         string            `json:"id"`
	Actor      NotificationActor `json:"actor"`
	EventType  string            `json:"event_type"` // 'like', 'comment', 'follow'
	ResourceID string            `json:"resource_id"`
	ReadAt     *time.Time        `json:"read_at,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
}

type Service struct {
	pool    *pgxpool.Pool
	storage storage.StorageService
}

func NewService(pool *pgxpool.Pool, storage storage.StorageService) *Service {
	return &Service{
		pool:    pool,
		storage: storage,
	}
}

func (s *Service) ListNotifications(ctx context.Context, recipientID string, limit int) ([]Notification, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	query := `
		SELECT 
			n.id, n.event_type, n.resource_id, n.read_at, n.created_at,
			u.id, u.username, u.display_name, u.avatar_key
		FROM notifications n
		JOIN users u ON n.actor_id = u.id
		WHERE n.recipient_id = $1
		ORDER BY n.created_at DESC
		LIMIT $2;
	`

	rows, err := s.pool.Query(ctx, query, recipientID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []Notification
	for rows.Next() {
		var n Notification
		var avatarKey *string
		err := rows.Scan(
			&n.ID,
			&n.EventType,
			&n.ResourceID,
			&n.ReadAt,
			&n.CreatedAt,
			&n.Actor.ID,
			&n.Actor.Username,
			&n.Actor.DisplayName,
			&avatarKey,
		)
		if err != nil {
			return nil, err
		}

		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			n.Actor.AvatarURL = s.storage.PublicURL(*avatarKey)
		}

		notifs = append(notifs, n)
	}

	return notifs, nil
}

func (s *Service) MarkRead(ctx context.Context, recipientID, notificationID string) error {
	query := `
		UPDATE notifications 
		SET read_at = NOW() 
		WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL;
	`
	_, err := s.pool.Exec(ctx, query, notificationID, recipientID)
	return err
}

func (s *Service) MarkAllRead(ctx context.Context, recipientID string) error {
	query := `
		UPDATE notifications 
		SET read_at = NOW() 
		WHERE recipient_id = $1 AND read_at IS NULL;
	`
	_, err := s.pool.Exec(ctx, query, recipientID)
	return err
}
