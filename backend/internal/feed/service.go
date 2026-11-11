package feed

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/platform/storage"
	"travel-doodles/internal/posts"
)

type Service struct {
	pool    *pgxpool.Pool
	cache   cache.CacheService
	storage storage.StorageService
}

func NewService(pool *pgxpool.Pool, cache cache.CacheService, storage storage.StorageService) *Service {
	return &Service{
		pool:    pool,
		cache:   cache,
		storage: storage,
	}
}

// GetFeed generates personalized timeline of followed users' posts using fan-out-on-read
func (s *Service) GetFeed(ctx context.Context, userID string, cursor string, limit int) (*posts.PaginatedPosts, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	isFirstPage := (cursor == "")
	cacheKey := cache.FeedFirstPageKey(userID)

	// Check first-page feed cache
	if isFirstPage && s.cache != nil {
		if cached, ok := s.cache.Get(ctx, cacheKey); ok {
			var resp posts.PaginatedPosts
			if err := json.Unmarshal(cached, &resp); err == nil {
				return &resp, nil
			}
		}
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
				p.id, p.author_id, p.caption, p.latitude, p.longitude, p.location_name,
				p.country_code, p.visibility, p.like_count, p.comment_count,
				p.visited_at, p.created_at, p.updated_at,
				u.username, u.display_name, u.avatar_key,
				EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1) as has_liked
			FROM posts p
			JOIN users u ON p.author_id = u.id
			WHERE p.deleted_at IS NULL
			  AND p.visibility IN ('public', 'friends')
			  AND (
				  EXISTS(SELECT 1 FROM friends fr WHERE (fr.user_id_1 = LEAST(p.author_id, $1) AND fr.user_id_2 = GREATEST(p.author_id, $1)))
				  OR EXISTS(SELECT 1 FROM follows f WHERE f.following_id = p.author_id AND f.follower_id = $1)
			  )
			  AND (p.created_at, p.id) < ($2, $3::uuid)
			  AND NOT EXISTS (
				  SELECT 1 FROM blocks b 
				  WHERE (b.blocker_id = p.author_id AND b.blocked_id = $1)
				     OR (b.blocker_id = $1 AND b.blocked_id = p.author_id)
			  )
			ORDER BY p.created_at DESC, p.id DESC
			LIMIT $4;
		`
		args = []interface{}{userID, cursorTime, cursorID, limit + 1}
	} else {
		query = `
			SELECT 
				p.id, p.author_id, p.caption, p.latitude, p.longitude, p.location_name,
				p.country_code, p.visibility, p.like_count, p.comment_count,
				p.visited_at, p.created_at, p.updated_at,
				u.username, u.display_name, u.avatar_key,
				EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = $1) as has_liked
			FROM posts p
			JOIN users u ON p.author_id = u.id
			WHERE p.deleted_at IS NULL
			  AND p.visibility IN ('public', 'friends')
			  AND (
				  EXISTS(SELECT 1 FROM friends fr WHERE (fr.user_id_1 = LEAST(p.author_id, $1) AND fr.user_id_2 = GREATEST(p.author_id, $1)))
				  OR EXISTS(SELECT 1 FROM follows f WHERE f.following_id = p.author_id AND f.follower_id = $1)
			  )
			  AND NOT EXISTS (
				  SELECT 1 FROM blocks b 
				  WHERE (b.blocker_id = p.author_id AND b.blocked_id = $1)
				     OR (b.blocker_id = $1 AND b.blocked_id = p.author_id)
			  )
			ORDER BY p.created_at DESC, p.id DESC
			LIMIT $2;
		`
		args = []interface{}{userID, limit + 1}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var feedPosts []posts.Post
	for rows.Next() {
		var p posts.Post
		var avatarKey *string
		err := rows.Scan(
			&p.ID,
			&p.Author.ID,
			&p.Caption,
			&p.Latitude,
			&p.Longitude,
			&p.LocationName,
			&p.CountryCode,
			&p.Visibility,
			&p.LikeCount,
			&p.CommentCount,
			&p.VisitedAt,
			&p.CreatedAt,
			&p.UpdatedAt,
			&p.Author.Username,
			&p.Author.DisplayName,
			&avatarKey,
			&p.HasLiked,
		)
		if err != nil {
			return nil, err
		}

		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			p.Author.AvatarURL = s.storage.PublicURL(*avatarKey)
		}
		feedPosts = append(feedPosts, p)
	}

	hasMore := len(feedPosts) > limit
	if hasMore {
		feedPosts = feedPosts[:limit]
	}

	var nextCursor *string
	if hasMore && len(feedPosts) > 0 {
		last := feedPosts[len(feedPosts)-1]
		val := fmt.Sprintf("%s,%s", last.CreatedAt.Format(time.RFC3339Nano), last.ID)
		encoded := base64.URLEncoding.EncodeToString([]byte(val))
		nextCursor = &encoded
	}

	// Attach media items in batch
	if len(feedPosts) > 0 {
		s.attachMediaBatch(ctx, feedPosts)
	}

	res := &posts.PaginatedPosts{
		Posts:      feedPosts,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}

	// Cache first page for 60 seconds with jitter
	if isFirstPage && s.cache != nil {
		if data, err := json.Marshal(res); err == nil {
			_ = s.cache.Set(ctx, cacheKey, data, 60*time.Second)
		}
	}

	return res, nil
}

func (s *Service) attachMediaBatch(ctx context.Context, feedPosts []posts.Post) {
	postIDs := make([]string, len(feedPosts))
	postMap := make(map[string]*posts.Post, len(feedPosts))
	for i := range feedPosts {
		postIDs[i] = feedPosts[i].ID
		postMap[feedPosts[i].ID] = &feedPosts[i]
	}

	mediaQuery := `
		SELECT post_id, id, object_key, thumbnail_key, width, height, sort_order
		FROM post_media
		WHERE post_id = ANY($1::uuid[])
		ORDER BY sort_order ASC;
	`
	rows, err := s.pool.Query(ctx, mediaQuery, postIDs)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var postID string
		var m posts.MediaItem
		if err := rows.Scan(&postID, &m.ID, &m.ObjectKey, &m.ThumbnailKey, &m.Width, &m.Height, &m.SortOrder); err == nil {
			if s.storage != nil {
				m.URL = s.storage.PublicURL(m.ObjectKey)
				if m.ThumbnailKey != "" {
					m.ThumbnailURL = s.storage.PublicURL(m.ThumbnailKey)
				}
			}
			if p, ok := postMap[postID]; ok {
				p.Media = append(p.Media, m)
			}
		}
	}
}
