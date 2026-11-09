package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/platform/config"
)

var (
	ErrSessionNotFound = errors.New("session not found or expired")
	ErrUnauthorized    = errors.New("unauthorized")
)

type Session struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	DisplayName  string    `json:"display_name"`
	Bio          string    `json:"bio"`
	AvatarKey    *string   `json:"avatar_key,omitempty"`
	AvatarURL    string    `json:"avatar_url,omitempty"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// SessionManager handles creating, validating, and revoking user sessions
type SessionManager struct {
	pool *pgxpool.Pool
	cfg  *config.Config
}

func (sm *SessionManager) CookieName() string {
	return sm.cfg.SessionCookieName
}


func NewSessionManager(pool *pgxpool.Pool, cfg *config.Config) *SessionManager {
	return &SessionManager{
		pool: pool,
		cfg:  cfg,
	}
}

// GenerateToken creates 32 cryptographically secure random bytes encoded as hex
func GenerateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// HashToken computes SHA-256 of the raw session token for secure database storage
func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// CreateSession persists a new session in PostgreSQL
func (sm *SessionManager) CreateSession(ctx context.Context, userID, ipAddress, userAgent string) (string, *Session, error) {
	rawToken, err := GenerateToken()
	if err != nil {
		return "", nil, err
	}

	tokenHash := HashToken(rawToken)
	duration := time.Duration(sm.cfg.SessionDurationHours) * time.Hour
	expiresAt := time.Now().Add(duration)

	query := `
		INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
		VALUES ($1, $2, NULLIF($3, '')::inet, $4, $5)
		RETURNING id, created_at;
	`

	var sess Session
	sess.UserID = userID
	sess.ExpiresAt = expiresAt

	err = sm.pool.QueryRow(ctx, query, userID, tokenHash, ipAddress, userAgent, expiresAt).
		Scan(&sess.ID, &sess.CreatedAt)
	if err != nil {
		return "", nil, err
	}

	return rawToken, &sess, nil
}

// ValidateSessionToken looks up a session by token hash and ensures it has not expired
func (sm *SessionManager) ValidateSessionToken(ctx context.Context, rawToken string) (*User, error) {
	if rawToken == "" {
		return nil, ErrUnauthorized
	}

	tokenHash := HashToken(rawToken)
	query := `
		SELECT u.id, u.username, u.email, u.display_name, u.bio, u.avatar_key, u.created_at, u.updated_at
		FROM sessions s
		JOIN users u ON s.user_id = u.id
		WHERE s.token_hash = $1 AND s.expires_at > NOW();
	`

	var u User
	err := sm.pool.QueryRow(ctx, query, tokenHash).Scan(
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
		return nil, ErrSessionNotFound
	}

	return &u, nil
}

// RevokeSession deletes a specific session by token
func (sm *SessionManager) RevokeSession(ctx context.Context, rawToken string) error {
	tokenHash := HashToken(rawToken)
	query := `DELETE FROM sessions WHERE token_hash = $1;`
	_, err := sm.pool.Exec(ctx, query, tokenHash)
	return err
}

// SetSessionCookie configures a secure HttpOnly cookie on the response
func (sm *SessionManager) SetSessionCookie(w http.ResponseWriter, rawToken string) {
	maxAge := sm.cfg.SessionDurationHours * 3600
	sameSite := http.SameSiteLaxMode
	if sm.cfg.SessionSameSite == "strict" {
		sameSite = http.SameSiteStrictMode
	} else if sm.cfg.SessionSameSite == "none" {
		sameSite = http.SameSiteNoneMode
	}

	cookie := &http.Cookie{
		Name:     sm.cfg.SessionCookieName,
		Value:    rawToken,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   sm.cfg.SessionSecureCookie,
		SameSite: sameSite,
	}
	http.SetCookie(w, cookie)
}

// ClearSessionCookie sets an expired cookie to clear client credentials
func (sm *SessionManager) ClearSessionCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     sm.cfg.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   sm.cfg.SessionSecureCookie,
		SameSite: http.SameSiteLaxMode,
	}
	http.SetCookie(w, cookie)
}
