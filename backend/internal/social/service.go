package social

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/cache"
)

var (
	ErrCannotFollowSelf = errors.New("cannot follow yourself")
	ErrCannotBlockSelf  = errors.New("cannot block yourself")
	ErrBlocked          = errors.New("interaction blocked")
	ErrTargetNotFound   = errors.New("target not found")
)

type Service struct {
	pool  *pgxpool.Pool
	cache cache.CacheService
}

func NewService(pool *pgxpool.Pool, cache cache.CacheService) *Service {
	return &Service{
		pool:  pool,
		cache: cache,
	}
}

// FollowUser establishes a follow relationship idempotently
func (s *Service) FollowUser(ctx context.Context, followerID, targetUserID string) error {
	if followerID == targetUserID {
		return ErrCannotFollowSelf
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Check blocks
	var isBlocked bool
	blockCheck := `
		SELECT EXISTS(
			SELECT 1 FROM blocks 
			WHERE (blocker_id = $1 AND blocked_id = $2)
			   OR (blocker_id = $2 AND blocked_id = $1)
		);
	`
	if err := tx.QueryRow(ctx, blockCheck, followerID, targetUserID).Scan(&isBlocked); err != nil {
		return err
	}
	if isBlocked {
		return ErrBlocked
	}

	// Idempotent insert into follows
	followQuery := `
		INSERT INTO follows (follower_id, following_id)
		VALUES ($1, $2)
		ON CONFLICT (follower_id, following_id) DO NOTHING;
	`
	cmd, err := tx.Exec(ctx, followQuery, followerID, targetUserID)
	if err != nil {
		return err
	}

	// If newly followed, create notification and transactional outbox event
	if cmd.RowsAffected() > 0 {
		notifQuery := `
			INSERT INTO notifications (recipient_id, actor_id, event_type, resource_id)
			VALUES ($1, $2, 'follow', $2);
		`
		_, _ = tx.Exec(ctx, notifQuery, targetUserID, followerID)

		outboxQuery := `
			INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
			VALUES ('user_followed', 'user', $1, $2);
		`
		payload, _ := json.Marshal(map[string]string{
			"follower_id": followerID,
			"target_id":   targetUserID,
		})
		_, _ = tx.Exec(ctx, outboxQuery, targetUserID, payload)
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	// Invalidate feed cache for the follower
	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(followerID))
	}

	return nil
}

// UnfollowUser removes a follow relationship idempotently
func (s *Service) UnfollowUser(ctx context.Context, followerID, targetUserID string) error {
	query := `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2;`
	_, err := s.pool.Exec(ctx, query, followerID, targetUserID)
	if err != nil {
		return err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(followerID))
	}
	return nil
}

// BlockUser blocks another user and removes mutual follows
func (s *Service) BlockUser(ctx context.Context, blockerID, targetUserID string) error {
	if blockerID == targetUserID {
		return ErrCannotBlockSelf
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert block
	blockQuery := `
		INSERT INTO blocks (blocker_id, blocked_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING;
	`
	if _, err := tx.Exec(ctx, blockQuery, blockerID, targetUserID); err != nil {
		return err
	}

	// Sever all mutual follows
	severQuery := `
		DELETE FROM follows 
		WHERE (follower_id = $1 AND following_id = $2)
		   OR (follower_id = $2 AND following_id = $1);
	`
	if _, err := tx.Exec(ctx, severQuery, blockerID, targetUserID); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(blockerID))
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(targetUserID))
	}
	return nil
}

// UnblockUser removes a block
func (s *Service) UnblockUser(ctx context.Context, blockerID, targetUserID string) error {
	query := `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2;`
	_, err := s.pool.Exec(ctx, query, blockerID, targetUserID)
	return err
}

// LikePost adds a like idempotently, updates count, and notifies post author
func (s *Service) LikePost(ctx context.Context, userID, postID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Fetch post author to verify existence and block state
	var authorID string
	var visibility string
	checkQuery := `
		SELECT author_id, visibility 
		FROM posts 
		WHERE id = $1 AND deleted_at IS NULL;
	`
	err = tx.QueryRow(ctx, checkQuery, postID).Scan(&authorID, &visibility)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTargetNotFound
		}
		return err
	}

	// Insert unique like
	likeQuery := `
		INSERT INTO likes (user_id, post_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, post_id) DO NOTHING;
	`
	cmd, err := tx.Exec(ctx, likeQuery, userID, postID)
	if err != nil {
		return err
	}

	// If newly liked
	if cmd.RowsAffected() > 0 {
		updateCount := `UPDATE posts SET like_count = like_count + 1 WHERE id = $1;`
		_, _ = tx.Exec(ctx, updateCount, postID)

		// Don't notify if liking own post
		if authorID != userID {
			notifQuery := `
				INSERT INTO notifications (recipient_id, actor_id, event_type, resource_id)
				VALUES ($1, $2, 'like', $3);
			`
			_, _ = tx.Exec(ctx, notifQuery, authorID, userID, postID)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.PostDetailKey(postID))
	}

	return nil
}

// UnlikePost removes a like idempotently and updates post count
func (s *Service) UnlikePost(ctx context.Context, userID, postID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	deleteQuery := `DELETE FROM likes WHERE user_id = $1 AND post_id = $2;`
	cmd, err := tx.Exec(ctx, deleteQuery, userID, postID)
	if err != nil {
		return err
	}

	if cmd.RowsAffected() > 0 {
		updateCount := `UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1;`
		_, _ = tx.Exec(ctx, updateCount, postID)
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.PostDetailKey(postID))
	}

	return nil
}
