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
	ErrInviteExpired         = errors.New("this friend invite link has expired (valid for 3 days)")
	ErrInviteExhausted       = errors.New("this friend invite link has reached its maximum uses")
	ErrCannotAcceptOwnInvite = errors.New("you cannot accept your own invite link")
	ErrRequestNotFound       = errors.New("friend request not found")
	ErrRequestAlreadySent    = errors.New("friend request already sent")
	ErrUnauthorizedRequest   = errors.New("unauthorized to act on this friend request")
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
	if expireHours <= 0 {
		expireHours = 72 // 3 days default TTL
	}
	exp := time.Now().Add(time.Duration(expireHours) * time.Hour)
	expiresAt = &exp

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

// SearchUsers searches travelers by handle or display name and returns relationship status
func (s *Service) SearchUsers(ctx context.Context, currentUserID, query string) ([]UserSearchResult, error) {
	if s.pool == nil {
		return []UserSearchResult{}, nil
	}

	clean := strings.TrimPrefix(strings.TrimSpace(query), "@")
	if clean == "" {
		return []UserSearchResult{}, nil
	}

	searchPattern := "%" + strings.ToLower(clean) + "%"
	q := `
		SELECT 
			u.id, COALESCE(u.custom_id, u.username), u.username, u.display_name, u.avatar_key,
			CASE 
				WHEN u.id::text = $2 THEN 'self'
				WHEN EXISTS(
					SELECT 1 FROM friends f 
					WHERE (f.user_id_1 = u.id AND f.user_id_2::text = $2)
					   OR (f.user_id_2 = u.id AND f.user_id_1::text = $2)
				) THEN 'friends'
				WHEN EXISTS(
					SELECT 1 FROM friend_requests fr 
					WHERE fr.sender_id::text = $2 AND fr.receiver_id = u.id AND fr.status = 'pending'
				) THEN 'pending_sent'
				WHEN EXISTS(
					SELECT 1 FROM friend_requests fr 
					WHERE fr.sender_id = u.id AND fr.receiver_id::text = $2 AND fr.status = 'pending'
				) THEN 'pending_received'
				ELSE 'none'
			END AS friendship_status,
			COALESCE((
				SELECT fr.id::text FROM friend_requests fr
				WHERE (fr.sender_id = u.id AND fr.receiver_id::text = $2 AND fr.status = 'pending')
				   OR (fr.sender_id::text = $2 AND fr.receiver_id = u.id AND fr.status = 'pending')
				LIMIT 1
			), '') AS active_request_id
		FROM users u
		WHERE LOWER(u.custom_id) LIKE $1 OR LOWER(u.username) LIKE $1 OR LOWER(u.display_name) LIKE $1
		ORDER BY 
			CASE WHEN LOWER(u.custom_id) = LOWER($3) THEN 1 ELSE 2 END,
			u.display_name ASC
		LIMIT 10;
	`

	rows, err := s.pool.Query(ctx, q, searchPattern, currentUserID, clean)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []UserSearchResult
	for rows.Next() {
		var item UserSearchResult
		var avatarKey *string
		if err := rows.Scan(
			&item.ID,
			&item.CustomID,
			&item.Username,
			&item.DisplayName,
			&avatarKey,
			&item.FriendshipStatus,
			&item.ActiveRequestID,
		); err != nil {
			return nil, err
		}
		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			item.AvatarURL = s.storage.PublicURL(*avatarKey)
		}
		results = append(results, item)
	}

	return results, nil
}

// SendFriendRequest creates a pending friend request
func (s *Service) SendFriendRequest(ctx context.Context, senderID, targetCustomIDOrID string) (*FriendRequest, *Friend, error) {
	if s.pool == nil {
		return nil, nil, errors.New("database not configured")
	}

	clean := strings.TrimPrefix(strings.TrimSpace(targetCustomIDOrID), "@")
	if clean == "" {
		return nil, nil, ErrUserNotFound
	}

	// 1. Look up target user
	lookupQuery := `
		SELECT id, COALESCE(custom_id, username), username, display_name, avatar_key
		FROM users
		WHERE LOWER(custom_id) = LOWER($1) OR LOWER(username) = LOWER($1) OR id::text = $1;
	`
	var target Friend
	var avatarKey *string
	err := s.pool.QueryRow(ctx, lookupQuery, clean).Scan(
		&target.ID,
		&target.CustomID,
		&target.Username,
		&target.DisplayName,
		&avatarKey,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrUserNotFound
		}
		return nil, nil, err
	}
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		target.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	if target.ID == senderID {
		return nil, nil, ErrCannotFriendSelf
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
	_ = s.pool.QueryRow(ctx, blockCheck, senderID, target.ID).Scan(&isBlocked)
	if isBlocked {
		return nil, nil, ErrBlocked
	}

	// 3. Check if already friends
	u1, u2 := CanonicalPair(senderID, target.ID)
	var alreadyFriends bool
	friendCheck := `SELECT EXISTS(SELECT 1 FROM friends WHERE user_id_1 = $1 AND user_id_2 = $2);`
	_ = s.pool.QueryRow(ctx, friendCheck, u1, u2).Scan(&alreadyFriends)
	if alreadyFriends {
		return nil, nil, ErrAlreadyFriends
	}

	// 4. Check if pending request exists
	var existingID string
	var existingSenderID string
	var existingStatus string
	checkReq := `
		SELECT id, sender_id, status FROM friend_requests
		WHERE (sender_id = $1 AND receiver_id = $2)
		   OR (sender_id = $2 AND receiver_id = $1)
		ORDER BY created_at DESC LIMIT 1;
	`
	err = s.pool.QueryRow(ctx, checkReq, senderID, target.ID).Scan(&existingID, &existingSenderID, &existingStatus)
	if err == nil && existingStatus == "pending" {
		if existingSenderID == senderID {
			return nil, nil, ErrRequestAlreadySent
		}
		// If the other user already sent a pending request -> automatically accept!
		friend, acceptErr := s.AcceptFriendRequest(ctx, senderID, existingID)
		if acceptErr != nil {
			return nil, nil, acceptErr
		}
		return &FriendRequest{ID: existingID, SenderID: target.ID, ReceiverID: senderID, Status: "accepted"}, friend, nil
	}

	// 5. Insert new friend request
	insertQuery := `
		INSERT INTO friend_requests (sender_id, receiver_id, status)
		VALUES ($1, $2, 'pending')
		ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending', updated_at = NOW()
		RETURNING id, created_at, updated_at;
	`
	var req FriendRequest
	req.SenderID = senderID
	req.ReceiverID = target.ID
	req.Status = "pending"
	err = s.pool.QueryRow(ctx, insertQuery, senderID, target.ID).Scan(&req.ID, &req.CreatedAt, &req.UpdatedAt)
	if err != nil {
		return nil, nil, err
	}

	return &req, &target, nil
}

// ListFriendRequests returns incoming and outgoing pending requests
func (s *Service) ListFriendRequests(ctx context.Context, userID string) ([]FriendRequest, []FriendRequest, error) {
	if s.pool == nil {
		return []FriendRequest{}, []FriendRequest{}, nil
	}

	queryIncoming := `
		SELECT 
			fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at, fr.updated_at,
			u.id, COALESCE(u.custom_id, u.username), u.username, u.display_name, u.avatar_key
		FROM friend_requests fr
		JOIN users u ON fr.sender_id = u.id
		WHERE fr.receiver_id = $1 AND fr.status = 'pending'
		ORDER BY fr.created_at DESC;
	`
	rowsIn, err := s.pool.Query(ctx, queryIncoming, userID)
	if err != nil {
		return nil, nil, err
	}
	defer rowsIn.Close()

	var incoming []FriendRequest
	for rowsIn.Next() {
		var req FriendRequest
		var sender Friend
		var avatarKey *string
		if err := rowsIn.Scan(
			&req.ID, &req.SenderID, &req.ReceiverID, &req.Status, &req.CreatedAt, &req.UpdatedAt,
			&sender.ID, &sender.CustomID, &sender.Username, &sender.DisplayName, &avatarKey,
		); err != nil {
			return nil, nil, err
		}
		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			sender.AvatarURL = s.storage.PublicURL(*avatarKey)
		}
		req.Sender = &sender
		incoming = append(incoming, req)
	}

	queryOutgoing := `
		SELECT 
			fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at, fr.updated_at,
			u.id, COALESCE(u.custom_id, u.username), u.username, u.display_name, u.avatar_key
		FROM friend_requests fr
		JOIN users u ON fr.receiver_id = u.id
		WHERE fr.sender_id = $1 AND fr.status = 'pending'
		ORDER BY fr.created_at DESC;
	`
	rowsOut, err := s.pool.Query(ctx, queryOutgoing, userID)
	if err != nil {
		return nil, nil, err
	}
	defer rowsOut.Close()

	var outgoing []FriendRequest
	for rowsOut.Next() {
		var req FriendRequest
		var receiver Friend
		var avatarKey *string
		if err := rowsOut.Scan(
			&req.ID, &req.SenderID, &req.ReceiverID, &req.Status, &req.CreatedAt, &req.UpdatedAt,
			&receiver.ID, &receiver.CustomID, &receiver.Username, &receiver.DisplayName, &avatarKey,
		); err != nil {
			return nil, nil, err
		}
		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			receiver.AvatarURL = s.storage.PublicURL(*avatarKey)
		}
		req.Receiver = &receiver
		outgoing = append(outgoing, req)
	}

	return incoming, outgoing, nil
}

// AcceptFriendRequest confirms a pending request and creates mutual friendship
func (s *Service) AcceptFriendRequest(ctx context.Context, userID, requestID string) (*Friend, error) {
	if s.pool == nil {
		return nil, errors.New("database not configured")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var senderID, receiverID, status string
	checkQuery := `SELECT sender_id, receiver_id, status FROM friend_requests WHERE id = $1 FOR UPDATE;`
	err = tx.QueryRow(ctx, checkQuery, requestID).Scan(&senderID, &receiverID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRequestNotFound
		}
		return nil, err
	}

	if receiverID != userID {
		return nil, ErrUnauthorizedRequest
	}
	if status != "pending" {
		return nil, fmt.Errorf("request is already %s", status)
	}

	// Update request status
	_, err = tx.Exec(ctx, `UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1;`, requestID)
	if err != nil {
		return nil, err
	}

	// Add mutual friend relation
	u1, u2 := CanonicalPair(senderID, receiverID)
	insertFriend := `
		INSERT INTO friends (user_id_1, user_id_2, source)
		VALUES ($1, $2, 'request')
		ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
	`
	if _, err := tx.Exec(ctx, insertFriend, u1, u2); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	if s.cache != nil {
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(senderID))
		_ = s.cache.Delete(ctx, cache.FeedFirstPageKey(receiverID))
	}

	// Fetch sender details to return
	var friend Friend
	var avatarKey *string
	userQuery := `SELECT id, COALESCE(custom_id, username), username, display_name, avatar_key FROM users WHERE id = $1;`
	_ = s.pool.QueryRow(ctx, userQuery, senderID).Scan(
		&friend.ID, &friend.CustomID, &friend.Username, &friend.DisplayName, &avatarKey,
	)
	if avatarKey != nil && *avatarKey != "" && s.storage != nil {
		friend.AvatarURL = s.storage.PublicURL(*avatarKey)
	}

	return &friend, nil
}

// DeclineFriendRequest marks request as declined
func (s *Service) DeclineFriendRequest(ctx context.Context, userID, requestID string) error {
	if s.pool == nil {
		return nil
	}
	res, err := s.pool.Exec(
		ctx,
		`UPDATE friend_requests SET status = 'declined', updated_at = NOW() WHERE id = $1 AND receiver_id = $2 AND status = 'pending';`,
		requestID, userID,
	)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrRequestNotFound
	}
	return nil
}

// CancelFriendRequest marks outgoing request as cancelled
func (s *Service) CancelFriendRequest(ctx context.Context, userID, requestID string) error {
	if s.pool == nil {
		return nil
	}
	res, err := s.pool.Exec(
		ctx,
		`UPDATE friend_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND sender_id = $2 AND status = 'pending';`,
		requestID, userID,
	)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrRequestNotFound
	}
	return nil
}
