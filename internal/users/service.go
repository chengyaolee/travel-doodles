package users

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/auth"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/platform/storage"
)

var (
	ErrUserNotFound = errors.New("user not found")
	ErrForbidden    = errors.New("access forbidden")
)

type ProfileResponse struct {
	ID             string    `json:"id"`
	Username       string    `json:"username"`
	DisplayName    string    `json:"display_name"`
	Bio            string    `json:"bio"`
	AvatarURL      string    `json:"avatar_url,omitempty"`
	PostCount      int       `json:"post_count"`
	FollowerCount  int       `json:"follower_count"`
	FollowingCount int       `json:"following_count"`
	IsFollowing    bool      `json:"is_following"`
	IsSelf         bool      `json:"is_self"`
	CreatedAt      time.Time `json:"created_at"`
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

// GetProfile retrieves user profile with follower counts and follow state
func (s *Service) GetProfile(ctx context.Context, username string, viewerID string) (*ProfileResponse, error) {
	// Try cache for anonymous public views
	cacheKey := cache.ProfileKey(username)
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
			u.id, u.username, u.display_name, u.bio, u.avatar_key, u.created_at,
			(SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.deleted_at IS NULL AND p.visibility = 'public') as post_count,
			(SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) as follower_count,
			(SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) as following_count,
			EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = NULLIF($2, '')::uuid AND f.following_id = u.id) as is_following,
			EXISTS(SELECT 1 FROM blocks b WHERE (b.blocker_id = u.id AND b.blocked_id = NULLIF($2, '')::uuid) OR (b.blocker_id = NULLIF($2, '')::uuid AND b.blocked_id = u.id)) as is_blocked
		FROM users u
		WHERE LOWER(u.username) = LOWER($1);
	`

	var (
		p         ProfileResponse
		avatarKey *string
		isBlocked bool
	)

	err := s.pool.QueryRow(ctx, query, username, viewerID).Scan(
		&p.ID,
		&p.Username,
		&p.DisplayName,
		&p.Bio,
		&avatarKey,
		&p.CreatedAt,
		&p.PostCount,
		&p.FollowerCount,
		&p.FollowingCount,
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

	// Cache public view for 5 minutes
	if viewerID == "" && s.cache != nil {
		if data, err := json.Marshal(p); err == nil {
			_ = s.cache.Set(ctx, cacheKey, data, 5*time.Minute)
		}
	}

	return &p, nil
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
		RETURNING id, username, email, display_name, bio, avatar_key, created_at, updated_at;
	`

	var u auth.User
	err := s.pool.QueryRow(ctx, query, userID, req.DisplayName, req.Bio, req.AvatarKey).Scan(
		&u.ID,
		&u.Username,
		&u.Email,
		&u.DisplayName,
		&u.Bio,
		&u.AvatarKey,
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
		_ = s.cache.Delete(ctx, cache.ProfileKey(u.Username))
	}

	return &u, nil
}
