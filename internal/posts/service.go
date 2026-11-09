package posts

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/platform/storage"
)

var (
	ErrPostNotFound = errors.New("post not found")
	ErrForbidden    = errors.New("access to post forbidden")
	ErrInvalidInput = errors.New("invalid post parameters")
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

func (s *Service) CreatePost(ctx context.Context, authorID string, req CreatePostRequest) (*Post, error) {
	if req.Latitude < -90 || req.Latitude > 90 || req.Longitude < -180 || req.Longitude > 180 {
		return nil, fmt.Errorf("%w: coordinates out of range (lat: [-90,90], lon: [-180,180])", ErrInvalidInput)
	}

	if req.Visibility == "" {
		req.Visibility = "public"
	}
	if req.Visibility != "public" && req.Visibility != "friends" && req.Visibility != "private" {
		return nil, fmt.Errorf("%w: invalid visibility '%s'", ErrInvalidInput, req.Visibility)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Insert post record
	insertPostQuery := `
		INSERT INTO posts (
			author_id, caption, latitude, longitude,
			location_name, country_code, visibility, visited_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at;
	`

	var post Post
	post.Author.ID = authorID
	post.Caption = req.Caption
	post.Latitude = req.Latitude
	post.Longitude = req.Longitude
	post.LocationName = req.LocationName
	post.CountryCode = strings.ToUpper(req.CountryCode)
	post.Visibility = req.Visibility
	post.VisitedAt = req.VisitedAt

	err = tx.QueryRow(ctx, insertPostQuery,
		authorID, req.Caption, req.Latitude, req.Longitude,
		req.LocationName, post.CountryCode, req.Visibility, req.VisitedAt,
	).Scan(&post.ID, &post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert post: %w", err)
	}

	// 2. Insert media items and enqueue background image processing jobs
	insertMediaQuery := `
		INSERT INTO post_media (post_id, object_key, thumbnail_key, width, height, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at;
	`

	insertJobQuery := `
		INSERT INTO jobs (job_type, payload, status)
		VALUES ('process_image', $1, 'pending');
	`

	for idx, m := range req.Media {
		var mediaID string
		var mediaCreatedAt time.Time
		sortOrder := m.SortOrder
		if sortOrder == 0 {
			sortOrder = idx
		}

		err = tx.QueryRow(ctx, insertMediaQuery,
			post.ID, m.ObjectKey, "", m.Width, m.Height, sortOrder,
		).Scan(&mediaID, &mediaCreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to insert post media: %w", err)
		}

		// Enqueue image processing job
		jobPayload, _ := json.Marshal(map[string]interface{}{
			"post_id":    post.ID,
			"media_id":   mediaID,
			"object_key": m.ObjectKey,
		})
		if _, err := tx.Exec(ctx, insertJobQuery, jobPayload); err != nil {
			return nil, fmt.Errorf("failed to enqueue media job: %w", err)
		}

		item := MediaItem{
			ID:        mediaID,
			ObjectKey: m.ObjectKey,
			Width:     m.Width,
			Height:    m.Height,
			SortOrder: sortOrder,
		}
		if s.storage != nil {
			item.URL = s.storage.PublicURL(m.ObjectKey)
		}
		post.Media = append(post.Media, item)
	}

	// 3. Populate Author Info
	authorQuery := `SELECT username, display_name, avatar_key FROM users WHERE id = $1;`
	var avatarKey *string
	_ = tx.QueryRow(ctx, authorQuery, authorID).Scan(&post.Author.Username, &post.Author.DisplayName, &avatarKey)
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		post.Author.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Invalidate discovery map tile caches and author feed cache
	if s.cache != nil {
		_ = s.cache.DeletePrefix(ctx, cache.GeoTilePrefix())
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(authorID))
	}

	return &post, nil
}

func (s *Service) GetPostByID(ctx context.Context, postID, viewerID string) (*Post, error) {
	// Query post with privacy enforcement
	query := `
		SELECT 
			p.id, p.author_id, p.caption, p.latitude, p.longitude, p.location_name,
			p.country_code, p.visibility, p.like_count, p.comment_count,
			p.visited_at, p.created_at, p.updated_at,
			u.username, u.display_name, u.avatar_key,
			EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = NULLIF($2, '')::uuid) as has_liked,
			EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = NULLIF($2, '')::uuid AND f.following_id = p.author_id) as is_friend,
			EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id = p.author_id AND b.blocked_id = NULLIF($2, '')::uuid) OR (b.blocker_id = NULLIF($2, '')::uuid AND b.blocked_id = p.author_id)) as is_blocked
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.id = $1 AND p.deleted_at IS NULL;
	`

	var (
		p         Post
		avatarKey *string
		isFriend  bool
		isBlocked bool
	)

	err := s.pool.QueryRow(ctx, query, postID, viewerID).Scan(
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
		&isFriend,
		&isBlocked,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPostNotFound
		}
		return nil, err
	}

	if isBlocked {
		return nil, ErrForbidden
	}

	// Privacy Check
	isAuthor := (viewerID != "" && viewerID == p.Author.ID)
	if p.Visibility == "private" && !isAuthor {
		return nil, ErrForbidden
	}
	if p.Visibility == "friends" && !isAuthor && !isFriend {
		return nil, ErrForbidden
	}

	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		p.Author.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	// Fetch Media Items
	mediaQuery := `
		SELECT id, object_key, thumbnail_key, width, height, sort_order
		FROM post_media
		WHERE post_id = $1
		ORDER BY sort_order ASC;
	`
	rows, err := s.pool.Query(ctx, mediaQuery, postID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var m MediaItem
			_ = rows.Scan(&m.ID, &m.ObjectKey, &m.ThumbnailKey, &m.Width, &m.Height, &m.SortOrder)
			if s.storage != nil {
				m.URL = s.storage.PublicURL(m.ObjectKey)
				if m.ThumbnailKey != "" {
					m.ThumbnailURL = s.storage.PublicURL(m.ThumbnailKey)
				}
			}
			p.Media = append(p.Media, m)
		}
	}

	return &p, nil
}

func (s *Service) UpdatePost(ctx context.Context, postID, authorID string, req UpdatePostRequest) (*Post, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentVisibility string
	checkQuery := `SELECT author_id, visibility FROM posts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;`
	var ownerID string
	err = tx.QueryRow(ctx, checkQuery, postID).Scan(&ownerID, &currentVisibility)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPostNotFound
		}
		return nil, err
	}

	if ownerID != authorID {
		return nil, ErrForbidden
	}

	updateQuery := `
		UPDATE posts
		SET 
			caption = COALESCE($2, caption),
			visibility = COALESCE($3, visibility),
			location_name = COALESCE($4, location_name),
			updated_at = NOW()
		WHERE id = $1
		RETURNING visibility;
	`
	var updatedVisibility string
	err = tx.QueryRow(ctx, updateQuery, postID, req.Caption, req.Visibility, req.LocationName).Scan(&updatedVisibility)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// If visibility changed to private or from private, purge discovery cache
	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.PostDetailKey(postID))
		if currentVisibility != updatedVisibility {
			_ = s.cache.DeletePrefix(ctx, cache.GeoTilePrefix())
		}
	}

	return s.GetPostByID(ctx, postID, authorID)
}

func (s *Service) DeletePost(ctx context.Context, postID, authorID string) error {
	query := `
		UPDATE posts
		SET deleted_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND author_id = $2 AND deleted_at IS NULL;
	`
	cmd, err := s.pool.Exec(ctx, query, postID, authorID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrPostNotFound
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.PostDetailKey(postID))
		_ = s.cache.DeletePrefix(ctx, cache.GeoTilePrefix())
	}
	return nil
}

// ListPublicPosts returns public posts with keyset pagination
func (s *Service) ListPublicPosts(ctx context.Context, viewerID, cursor string, limit int) (*PaginatedPosts, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	var cursorTime time.Time
	var cursorID string
	if cursor != "" {
		decoded, err := base64.URLEncoding.DecodeString(cursor)
		if err == nil {
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
				EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = NULLIF($1, '')::uuid) as has_liked
			FROM posts p
			JOIN users u ON p.author_id = u.id
			WHERE p.deleted_at IS NULL AND p.visibility = 'public'
			  AND (p.created_at, p.id) < ($2, $3::uuid)
			ORDER BY p.created_at DESC, p.id DESC
			LIMIT $4;
		`
		args = []interface{}{viewerID, cursorTime, cursorID, limit + 1}
	} else {
		query = `
			SELECT 
				p.id, p.author_id, p.caption, p.latitude, p.longitude, p.location_name,
				p.country_code, p.visibility, p.like_count, p.comment_count,
				p.visited_at, p.created_at, p.updated_at,
				u.username, u.display_name, u.avatar_key,
				EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = NULLIF($1, '')::uuid) as has_liked
			FROM posts p
			JOIN users u ON p.author_id = u.id
			WHERE p.deleted_at IS NULL AND p.visibility = 'public'
			ORDER BY p.created_at DESC, p.id DESC
			LIMIT $2;
		`
		args = []interface{}{viewerID, limit + 1}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []Post
	for rows.Next() {
		var p Post
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
		posts = append(posts, p)
	}

	hasMore := len(posts) > limit
	if hasMore {
		posts = posts[:limit]
	}

	var nextCursor *string
	if hasMore && len(posts) > 0 {
		last := posts[len(posts)-1]
		val := fmt.Sprintf("%s,%s", last.CreatedAt.Format(time.RFC3339Nano), last.ID)
		encoded := base64.URLEncoding.EncodeToString([]byte(val))
		nextCursor = &encoded
	}

	// Attach media items in batch
	if len(posts) > 0 {
		s.attachMediaBatch(ctx, posts)
	}

	return &PaginatedPosts{
		Posts:      posts,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (s *Service) attachMediaBatch(ctx context.Context, posts []Post) {
	postIDs := make([]string, len(posts))
	postMap := make(map[string]*Post, len(posts))
	for i := range posts {
		postIDs[i] = posts[i].ID
		postMap[posts[i].ID] = &posts[i]
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
		var m MediaItem
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
