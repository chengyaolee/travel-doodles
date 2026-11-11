package friends

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/storage"
)

var (
	ErrUserNotFound          = errors.New("no traveler found with that user ID")
	ErrCannotFriendSelf      = errors.New("you cannot add yourself as a friend")
	ErrAlreadyFriends        = errors.New("you are already friends with this traveler")
	ErrBlocked               = errors.New("interaction blocked")
	ErrInviteNotFound        = errors.New("friend invite link not found")
	ErrInviteExpired         = errors.New("this friend invite link has expired")
	ErrInviteExhausted       = errors.New("this friend invite link has reached its maximum uses")
	ErrCannotAcceptOwnInvite = errors.New("you cannot accept your own invite link")
)

type Service struct {
	pool    *pgxpool.Pool
	cache   cache.CacheService
	storage storage.StorageService
	cfg     *config.Config
}

func NewService(pool *pgxpool.Pool, cache cache.CacheService, storage storage.StorageService, cfg *config.Config) *Service {
	return &Service{
		pool:    pool,
		cache:   cache,
		storage: storage,
		cfg:     cfg,
	}
}

// CanonicalPair orders two UUID strings so user_id_1 < user_id_2
func CanonicalPair(u1, u2 string) (string, string) {
	if u1 < u2 {
		return u1, u2
	}
	return u2, u1
}

// AddFriendByCustomID connects two travelers by entering the custom user ID
func (s *Service) AddFriendByCustomID(ctx context.Context, userID, targetCustomID string) (*Friend, error) {
	if s.pool == nil {
		return nil, errors.New("database not configured")
	}

	targetCustomID = strings.TrimSpace(targetCustomID)
	if targetCustomID == "" {
		return nil, ErrUserNotFound
	}

	// 1. Look up target user by custom_id (case-insensitive)
	lookupQuery := `
		SELECT id, COALESCE(custom_id, username), username, display_name, avatar_key
		FROM users
		WHERE LOWER(custom_id) = LOWER($1) OR LOWER(username) = LOWER($1);
	`
	var target Friend
	var avatarKey *string
	err := s.pool.QueryRow(ctx, lookupQuery, targetCustomID).Scan(
		&target.ID,
		&target.CustomID,
		&target.Username,
		&target.DisplayName,
		&avatarKey,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	if target.ID == userID {
		return nil, ErrCannotFriendSelf
	}

	// 2. Check blocks
	var isBlocked bool
	blockCheck := `
		SELECT EXISTS(
			SELECT 1 FROM blocks 
			WHERE (blocker_id = $1 AND blocked_id = $2)
			   OR (blocker_id = $2 AND blocked_id = $1)
		);
	`
	if err := s.pool.QueryRow(ctx, blockCheck, userID, target.ID).Scan(&isBlocked); err != nil {
		return nil, err
	}
	if isBlocked {
		return nil, ErrBlocked
	}

	u1, u2 := CanonicalPair(userID, target.ID)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 3. Insert into friends table
	insertQuery := `
		INSERT INTO friends (user_id_1, user_id_2, source)
		VALUES ($1, $2, 'id')
		ON CONFLICT (user_id_1, user_id_2) DO NOTHING
		RETURNING created_at;
	`
	err = tx.QueryRow(ctx, insertQuery, u1, u2).Scan(&target.FriendsSince)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Already friends
			return nil, ErrAlreadyFriends
		}
		return nil, err
	}

	target.Source = "id"
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		target.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	// 4. Send notification and outbox event
	notifQuery := `
		INSERT INTO notifications (recipient_id, actor_id, event_type, resource_id)
		VALUES ($1, $2, 'friend_added', $2);
	`
	_, _ = tx.Exec(ctx, notifQuery, target.ID, userID)

	outboxQuery := `
		INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
		VALUES ('friend_added', 'user', $1, $2);
	`
	payload, _ := json.Marshal(map[string]string{
		"user_id":   userID,
		"friend_id": target.ID,
		"source":    "id",
	})
	_, _ = tx.Exec(ctx, outboxQuery, userID, payload)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// 5. Invalidate feed caches for both users
	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(userID))
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(target.ID))
	}

	return &target, nil
}

// CreateInviteLink generates a shareable link that allows others to become friends instantly
func (s *Service) CreateInviteLink(ctx context.Context, inviterID string, maxUses int, expireHours int) (*FriendInvite, error) {
	if s.pool == nil {
		return nil, errors.New("database not configured")
	}
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return nil, err
	}
	code := hex.EncodeToString(b)

	var expiresAt *time.Time
	if expireHours > 0 {
		exp := time.Now().Add(time.Duration(expireHours) * time.Hour)
		expiresAt = &exp
	}

	query := `
		INSERT INTO friend_invites (inviter_id, code, max_uses, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at;
	`
	var inv FriendInvite
	inv.Code = code
	inv.InviterID = inviterID
	inv.MaxUses = maxUses
	inv.ExpiresAt = expiresAt

	err := s.pool.QueryRow(ctx, query, inviterID, code, maxUses, expiresAt).Scan(&inv.ID, &inv.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create friend invite: %w", err)
	}

	// Populate inviter details
	userQuery := `SELECT COALESCE(custom_id, username), display_name, avatar_key FROM users WHERE id = $1;`
	var avatarKey *string
	_ = s.pool.QueryRow(ctx, userQuery, inviterID).Scan(&inv.InviterCustomID, &inv.InviterName, &avatarKey)
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		inv.InviterAvatarURL = s.storage.PublicURL(*avatarKey)
	}

	baseURL := "http://localhost:3000"
	if s.cfg != nil && s.cfg.FrontendURL != "" {
		baseURL = strings.TrimRight(s.cfg.FrontendURL, "/")
	}
	inv.InviteURL = fmt.Sprintf("%s/invite/%s", baseURL, code)

	return &inv, nil
}

// GetInvite returns invite details so recipient can preview who sent it
func (s *Service) GetInvite(ctx context.Context, code string) (*FriendInvite, error) {
	if s.pool == nil {
		return nil, errors.New("database not configured")
	}
	query := `
		SELECT 
			i.id, i.code, i.inviter_id, i.max_uses, i.uses_count, i.expires_at, i.created_at,
			COALESCE(u.custom_id, u.username), u.display_name, u.avatar_key
		FROM friend_invites i
		JOIN users u ON i.inviter_id = u.id
		WHERE i.code = $1;
	`

	var inv FriendInvite
	var avatarKey *string
	err := s.pool.QueryRow(ctx, query, code).Scan(
		&inv.ID,
		&inv.Code,
		&inv.InviterID,
		&inv.MaxUses,
		&inv.UsesCount,
		&inv.ExpiresAt,
		&inv.CreatedAt,
		&inv.InviterCustomID,
		&inv.InviterName,
		&avatarKey,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInviteNotFound
		}
		return nil, err
	}

	if inv.ExpiresAt != nil && time.Now().After(*inv.ExpiresAt) {
		return nil, ErrInviteExpired
	}
	if inv.MaxUses > 0 && inv.UsesCount >= inv.MaxUses {
		return nil, ErrInviteExhausted
	}

	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		inv.InviterAvatarURL = s.storage.PublicURL(*avatarKey)
	}

	baseURL := "http://localhost:3000"
	if s.cfg != nil && s.cfg.FrontendURL != "" {
		baseURL = strings.TrimRight(s.cfg.FrontendURL, "/")
	}
	inv.InviteURL = fmt.Sprintf("%s/invite/%s", baseURL, code)

	return &inv, nil
}

// AcceptInvite establishes friendship between current user and invite sender
func (s *Service) AcceptInvite(ctx context.Context, userID, code string) (*Friend, error) {
	if s.pool == nil {
		return nil, errors.New("database not configured")
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Fetch invite with lock
	inviteQuery := `
		SELECT id, inviter_id, max_uses, uses_count, expires_at
		FROM friend_invites
		WHERE code = $1
		FOR UPDATE;
	`
	var (
		inviteID  string
		inviterID string
		maxUses   int
		usesCount int
		expiresAt *time.Time
	)
	err = tx.QueryRow(ctx, inviteQuery, code).Scan(&inviteID, &inviterID, &maxUses, &usesCount, &expiresAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInviteNotFound
		}
		return nil, err
	}

	if inviterID == userID {
		return nil, ErrCannotAcceptOwnInvite
	}
	if expiresAt != nil && time.Now().After(*expiresAt) {
		return nil, ErrInviteExpired
	}
	if maxUses > 0 && usesCount >= maxUses {
		return nil, ErrInviteExhausted
	}

	// Check blocks
	var isBlocked bool
	blockCheck := `
		SELECT EXISTS(
			SELECT 1 FROM blocks 
			WHERE (blocker_id = $1 AND blocked_id = $2)
			   OR (blocker_id = $2 AND blocked_id = $1)
		);
	`
	if err := tx.QueryRow(ctx, blockCheck, userID, inviterID).Scan(&isBlocked); err != nil {
		return nil, err
	}
	if isBlocked {
		return nil, ErrBlocked
	}

	u1, u2 := CanonicalPair(userID, inviterID)

	// Insert into friends table
	var friend Friend
	friend.ID = inviterID
	friend.Source = "link"

	insertFriendQuery := `
		INSERT INTO friends (user_id_1, user_id_2, source)
		VALUES ($1, $2, 'link')
		ON CONFLICT (user_id_1, user_id_2) DO UPDATE SET source = 'link'
		RETURNING created_at;
	`
	err = tx.QueryRow(ctx, insertFriendQuery, u1, u2).Scan(&friend.FriendsSince)
	if err != nil {
		return nil, err
	}

	// Increment uses count
	incrementQuery := `UPDATE friend_invites SET uses_count = uses_count + 1 WHERE id = $1;`
	if _, err := tx.Exec(ctx, incrementQuery, inviteID); err != nil {
		return nil, err
	}

	// Populate inviter details
	userQuery := `SELECT COALESCE(custom_id, username), username, display_name, avatar_key FROM users WHERE id = $1;`
	var avatarKey *string
	_ = tx.QueryRow(ctx, userQuery, inviterID).Scan(&friend.CustomID, &friend.Username, &friend.DisplayName, &avatarKey)
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		friend.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	// Send notification
	notifQuery := `
		INSERT INTO notifications (recipient_id, actor_id, event_type, resource_id)
		VALUES ($1, $2, 'friend_joined', $2);
	`
	_, _ = tx.Exec(ctx, notifQuery, inviterID, userID)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(userID))
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(inviterID))
	}

	return &friend, nil
}

// ListFriends returns mutual friends for a user
func (s *Service) ListFriends(ctx context.Context, userID string, limit, offset int) ([]Friend, error) {
	if s.pool == nil {
		return []Friend{}, nil
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT 
			CASE WHEN f.user_id_1 = $1 THEN u2.id ELSE u1.id END as friend_id,
			CASE WHEN f.user_id_1 = $1 THEN COALESCE(u2.custom_id, u2.username) ELSE COALESCE(u1.custom_id, u1.username) END as custom_id,
			CASE WHEN f.user_id_1 = $1 THEN u2.username ELSE u1.username END as username,
			CASE WHEN f.user_id_1 = $1 THEN u2.display_name ELSE u1.display_name END as display_name,
			CASE WHEN f.user_id_1 = $1 THEN u2.avatar_key ELSE u1.avatar_key END as avatar_key,
			f.source,
			f.created_at
		FROM friends f
		JOIN users u1 ON f.user_id_1 = u1.id
		JOIN users u2 ON f.user_id_2 = u2.id
		WHERE f.user_id_1 = $1 OR f.user_id_2 = $1
		ORDER BY f.created_at DESC
		LIMIT $2 OFFSET $3;
	`

	rows, err := s.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var friendList []Friend
	for rows.Next() {
		var f Friend
		var avatarKey *string
		err := rows.Scan(
			&f.ID,
			&f.CustomID,
			&f.Username,
			&f.DisplayName,
			&avatarKey,
			&f.Source,
			&f.FriendsSince,
		)
		if err != nil {
			return nil, err
		}
		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			f.AvatarURL = s.storage.PublicURL(*avatarKey)
		}
		friendList = append(friendList, f)
	}

	return friendList, nil
}

// RemoveFriend terminates a mutual friendship
func (s *Service) RemoveFriend(ctx context.Context, userID, friendID string) error {
	if s.pool == nil {
		return nil
	}
	u1, u2 := CanonicalPair(userID, friendID)
	query := `DELETE FROM friends WHERE user_id_1 = $1 AND user_id_2 = $2;`
	_, err := s.pool.Exec(ctx, query, u1, u2)
	if err != nil {
		return err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(userID))
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(friendID))
	}
	return nil
}
