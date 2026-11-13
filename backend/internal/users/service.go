package users

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/auth"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/platform/storage"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrForbidden       = errors.New("access forbidden")
	ErrCustomIDTaken   = errors.New("this user ID is already in use by another traveler")
	ErrInvalidCustomID = errors.New("user ID must be 3-30 characters long and contain only letters, numbers, and underscores")
	customIDRegex      = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)
)

type ProfilePostItem struct {
	ID           string     `json:"id"`
	Caption      string     `json:"caption"`
	Latitude     float64    `json:"latitude"`
	Longitude    float64    `json:"longitude"`
	LocationName string     `json:"location_name"`
	CountryCode  string     `json:"country_code"`
	Visibility   string     `json:"visibility"`
	LikeCount    int        `json:"like_count"`
	CommentCount int        `json:"comment_count"`
	Image        string     `json:"image"`
	VisitedAt    *time.Time `json:"visited_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type ProfileResponse struct {
	ID             string            `json:"id"`
	CustomID       string            `json:"custom_id"`
	Username       string            `json:"username"`
	DisplayName    string            `json:"display_name"`
	Bio            string            `json:"bio"`
	AvatarURL      string            `json:"avatar_url,omitempty"`
	PostCount      int               `json:"post_count"`
	FollowerCount  int               `json:"follower_count"`
	FollowingCount int               `json:"following_count"`
	FriendCount    int               `json:"friend_count"`
	IsFriend       bool              `json:"is_friend"`
	IsFollowing    bool              `json:"is_following"`
	IsSelf         bool              `json:"is_self"`
	CreatedAt      time.Time         `json:"created_at"`
	Posts          []ProfilePostItem `json:"posts"`
}

type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name"`
	Bio         *string `json:"bio"`
	AvatarKey   *string `json:"avatar_key"`
}

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

// GetProfile retrieves user profile with follower counts, friends count, and relationship states
func (s *Service) GetProfile(ctx context.Context, identifier string, viewerID string) (*ProfileResponse, error) {
	// Try cache for anonymous public views
	cacheKey := cache.ProfileKey(identifier)
	if viewerID == "" && s.cache != nil {
		if cached, ok := s.cache.Get(ctx, cacheKey); ok {
			var resp ProfileResponse
			if err := json.Unmarshal(cached, &resp); err == nil {
				return &resp, nil
			}
		}
	}

	query := `
		SELECT 
			u.id, 
			COALESCE(u.custom_id, u.username), 
			u.username, 
			u.display_name, 
			u.bio, 
			u.avatar_key, 
			u.created_at,
			(SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL AND p.visibility = 'public') as post_count,
			(SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) as follower_count,
			(SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) as following_count,
			(SELECT COUNT(*) FROM friends fr WHERE fr.user_id_1 = u.id OR fr.user_id_2 = u.id) as friend_count,
			EXISTS(SELECT 1 FROM friends fr WHERE (fr.user_id_1 = LEAST(u.id, NULLIF($2, '')::uuid) AND fr.user_id_2 = GREATEST(u.id, NULLIF($2, '')::uuid))) as is_friend,
			EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = NULLIF($2, '')::uuid AND f.following_id = u.id) as is_following,
			EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id = u.id AND b.blocked_id = NULLIF($2, '')::uuid) OR (b.blocker_id = NULLIF($2, '')::uuid AND b.blocked_id = u.id)) as is_blocked
		FROM users u
		WHERE LOWER(u.custom_id) = LOWER($1) OR LOWER(u.username) = LOWER($1);
	`

	var (
		p         ProfileResponse
		avatarKey *string
		isBlocked bool
	)

	err := s.pool.QueryRow(ctx, query, identifier, viewerID).Scan(
		&p.ID,
		&p.CustomID,
		&p.Username,
		&p.DisplayName,
		&p.Bio,
		&avatarKey,
		&p.CreatedAt,
		&p.PostCount,
		&p.FollowerCount,
		&p.FollowingCount,
		&p.FriendCount,
		&p.IsFriend,
		&p.IsFollowing,
		&isBlocked,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if isBlocked {
		return nil, ErrForbidden
	}

	p.IsSelf = (viewerID != "" && viewerID == p.ID)
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		p.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	p.Posts = make([]ProfilePostItem, 0)
	// Query posts authored by this traveler (respecting visibility permissions)
	postsQuery := `
		SELECT 
			p.id, p.caption, p.latitude, p.longitude, p.location_name,
			p.country_code, p.visibility, p.like_count, p.comment_count,
			p.visited_at, p.created_at,
			(SELECT COALESCE(NULLIF(pm.thumbnail_key, ''), pm.object_key, '') FROM post_media pm WHERE pm.post_id = p.id ORDER BY pm.sort_order ASC LIMIT 1) as media_key
		FROM posts p
		WHERE p.author_id = $1 AND p.deleted_at IS NULL
		  AND (
			  $2 = true
			  OR p.visibility = 'public'
			  OR (p.visibility = 'friends' AND $3 = true)
		  )
		ORDER BY p.created_at DESC
		LIMIT 50;
	`
	if postRows, err := s.pool.Query(ctx, postsQuery, p.ID, p.IsSelf, p.IsFriend); err == nil {
		defer postRows.Close()
		for postRows.Next() {
			var item ProfilePostItem
			var mediaKey *string
			if err := postRows.Scan(
				&item.ID,
				&item.Caption,
				&item.Latitude,
				&item.Longitude,
				&item.LocationName,
				&item.CountryCode,
				&item.Visibility,
				&item.LikeCount,
				&item.CommentCount,
				&item.VisitedAt,
				&item.CreatedAt,
				&mediaKey,
			); err == nil {
				if mediaKey != nil && *mediaKey != "" {
					if s.storage != nil {
						item.Image = s.storage.PublicURL(*mediaKey)
					} else {
						item.Image = *mediaKey
					}
				}
				p.Posts = append(p.Posts, item)
			}
		}
	}

	// Cache public view for 5 minutes
	if viewerID == "" && s.cache != nil {
		if data, err := json.Marshal(p); err == nil {
			_ = s.cache.Set(ctx, cacheKey, data, 5*time.Minute)
		}
	}

	return &p, nil
}

// UpdateCustomID allows travelers to customize their user ID
func (s *Service) UpdateCustomID(ctx context.Context, userID, newCustomID string) error {
	newCustomID = strings.TrimSpace(newCustomID)
	if !customIDRegex.MatchString(newCustomID) {
		return ErrInvalidCustomID
	}

	query := `
		UPDATE users
		SET custom_id = $2, username = $2, updated_at = NOW()
		WHERE id = $1;
	`
	_, err := s.pool.Exec(ctx, query, userID, newCustomID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrCustomIDTaken
		}
		return fmt.Errorf("failed to update custom user ID: %w", err)
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.ProfileKey(newCustomID))
	}
	return nil
}

// UpdateProfile updates the profile fields of an authenticated user
func (s *Service) UpdateProfile(ctx context.Context, userID string, req UpdateProfileRequest) (*auth.User, error) {
	query := `
		UPDATE users
		SET 
			display_name = COALESCE($2, display_name),
			bio = COALESCE($3, bio),
			avatar_key = COALESCE($4, avatar_key),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, COALESCE(custom_id, username), username, COALESCE(email, ''), display_name, bio, avatar_key, auth_provider, created_at, updated_at;
	`

	var u auth.User
	err := s.pool.QueryRow(ctx, query, userID, req.DisplayName, req.Bio, req.AvatarKey).Scan(
		&u.ID,
		&u.CustomID,
		&u.Username,
		&u.Email,
		&u.DisplayName,
		&u.Bio,
		&u.AvatarKey,
		&u.AuthProvider,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if u.AvatarKey != nil && *u.AvatarKey != "" && s.storage != nil {
		u.AvatarURL = s.storage.PublicURL(*u.AvatarKey)
	}

	// Invalidate cache
	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.ProfileKey(u.CustomID))
		_ = s.cache.Delete(ctx, cache.ProfileKey(u.Username))
	}

	return &u, nil
}
