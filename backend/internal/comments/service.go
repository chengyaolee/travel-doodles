package comments

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/platform/storage"
)

var (
	ErrCommentNotFound = errors.New("comment not found")
	ErrForbidden       = errors.New("access forbidden")
	ErrPostNotFound    = errors.New("post not found")
)

type CommentAuthor struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

type Comment struct {
	ID        string        `json:"id"`
	PostID    string        `json:"post_id"`
	ParentID  *string       `json:"parent_id,omitempty"`
	Author    CommentAuthor `json:"author"`
	Content   string        `json:"content"`
	CreatedAt time.Time     `json:"created_at"`
}

type PaginatedComments struct {
	Comments   []Comment `json:"comments"`
	NextCursor *string   `json:"next_cursor,omitempty"`
	HasMore    bool      `json:"has_more"`
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

func (s *Service) CreateComment(ctx context.Context, postID, authorID string, parentID *string, content string) (*Comment, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, errors.New("comment content cannot be empty")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Fetch post author to verify existence and notify
	var postAuthorID string
	postQuery := `SELECT author_id FROM posts WHERE id = $1 AND deleted_at IS NULL;`
	err = tx.QueryRow(ctx, postQuery, postID).Scan(&postAuthorID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPostNotFound
		}
		return nil, err
	}

	// Insert comment
	insertQuery := `
		INSERT INTO comments (post_id, author_id, parent_id, content)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at;
	`
	var c Comment
	c.PostID = postID
	c.ParentID = parentID
	c.Author.ID = authorID
	c.Content = content

	err = tx.QueryRow(ctx, insertQuery, postID, authorID, parentID, content).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Increment comment count on post
	updateCountQuery := `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1;`
	_, _ = tx.Exec(ctx, updateCountQuery, postID)

	// Populate author details
	authorQuery := `SELECT username, display_name, avatar_key FROM users WHERE id = $1;`
	var avatarKey *string
	_ = tx.QueryRow(ctx, authorQuery, authorID).Scan(&c.Author.Username, &c.Author.DisplayName, &avatarKey)
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		c.Author.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	// Create notification if not commenting on own post
	if postAuthorID != authorID {
		notifQuery := `
			INSERT INTO notifications (recipient_id, actor_id, event_type, resource_id)
			VALUES ($1, $2, 'comment', $3);
		`
		_, _ = tx.Exec(ctx, notifQuery, postAuthorID, authorID, postID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &c, nil
}

func (s *Service) ListComments(ctx context.Context, postID string, cursor string, limit int) (*PaginatedComments, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var cursorTime time.Time
	var cursorID string
	if cursor != "" {
		if decoded, err := base64.URLEncoding.DecodeString(cursor); err == nil {
			parts := strings.Split(string(decoded), ",")
			if len(parts) == 2 {
				if t, err := time.Parse(time.RFC3339Nano, parts[0]); err == nil {
					cursorTime = t
					cursorID = parts[1]
				}
			}
		}
	}

	var query string
	var args []interface{}

	if cursorID != "" && !cursorTime.IsZero() {
		query = `
			SELECT 
				c.id, c.post_id, c.parent_id, c.content, c.created_at,
				u.id, u.username, u.display_name, u.avatar_key
			FROM comments c
			JOIN users u ON c.author_id = u.id
			WHERE c.post_id = $1 AND c.deleted_at IS NULL
			  AND (c.created_at, c.id) > ($2, $3::uuid)
			ORDER BY c.created_at ASC, c.id ASC
			LIMIT $4;
		`
		args = []interface{}{postID, cursorTime, cursorID, limit + 1}
	} else {
		query = `
			SELECT 
				c.id, c.post_id, c.parent_id, c.content, c.created_at,
				u.id, u.username, u.display_name, u.avatar_key
			FROM comments c
			JOIN users u ON c.author_id = u.id
			WHERE c.post_id = $1 AND c.deleted_at IS NULL
			ORDER BY c.created_at ASC, c.id ASC
			LIMIT $2;
		`
		args = []interface{}{postID, limit + 1}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []Comment
	for rows.Next() {
		var c Comment
		var avatarKey *string
		err := rows.Scan(
			&c.ID,
			&c.PostID,
			&c.ParentID,
			&c.Content,
			&c.CreatedAt,
			&c.Author.ID,
			&c.Author.Username,
			&c.Author.DisplayName,
			&avatarKey,
		)
		if err != nil {
			return nil, err
		}
		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			c.Author.AvatarURL = s.storage.PublicURL(*avatarKey)
		}
		comments = append(comments, c)
	}

	hasMore := len(comments) > limit
	if hasMore {
		comments = comments[:limit]
	}

	var nextCursor *string
	if hasMore && len(comments) > 0 {
		last := comments[len(comments)-1]
		val := fmt.Sprintf("%s,%s", last.CreatedAt.Format(time.RFC3339Nano), last.ID)
		encoded := base64.URLEncoding.EncodeToString([]byte(val))
		nextCursor = &encoded
	}

	return &PaginatedComments{
		Comments:   comments,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (s *Service) DeleteComment(ctx context.Context, commentID, userID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Fetch comment author and post author (both can delete)
	query := `
		SELECT c.author_id, p.author_id, c.post_id
		FROM comments c
		JOIN posts p ON c.post_id = p.id
		WHERE c.id = $1 AND c.deleted_at IS NULL;
	`
	var commentAuthorID, postAuthorID, postID string
	err = tx.QueryRow(ctx, query, commentID).Scan(&commentAuthorID, &postAuthorID, &postID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrCommentNotFound
		}
		return err
	}

	if userID != commentAuthorID && userID != postAuthorID {
		return ErrForbidden
	}

	// Soft delete comment
	deleteQuery := `UPDATE comments SET deleted_at = NOW() WHERE id = $1;`
	_, err = tx.Exec(ctx, deleteQuery, commentID)
	if err != nil {
		return err
	}

	// Decrement post comment count
	decQuery := `UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = $1;`
	_, _ = tx.Exec(ctx, decQuery, postID)

	return tx.Commit(ctx)
}
