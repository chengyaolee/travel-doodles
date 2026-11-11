package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/observability"
	"travel-doodles/internal/platform/storage"
)

var (
	customIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)
)

type PasswordlessRegisterRequest struct {
	CustomID    string `json:"custom_id"`    // User-customizable ID (e.g. wanderlust_sam)
	DisplayName string `json:"display_name"` // Display Name
	Bio         string `json:"bio"`
}

type PasswordlessLoginRequest struct {
	CustomID    string `json:"custom_id"`
	DeviceToken string `json:"device_token"`
}

type OAuthRequest struct {
	Provider       string `json:"provider"`         // "google", "apple", "github"
	ProviderUserID string `json:"provider_user_id"` // Unique subject ID from provider
	CustomID       string `json:"custom_id"`        // Optional customized ID
	Email          string `json:"email,omitempty"`
	DisplayName    string `json:"display_name"`
	AvatarURL      string `json:"avatar_url,omitempty"`
}

type Handler struct {
	pool    *pgxpool.Pool
	sm      *SessionManager
	cfg     *config.Config
	storage storage.StorageService
}

func NewHandler(pool *pgxpool.Pool, sm *SessionManager, cfg *config.Config, storage storage.StorageService) *Handler {
	return &Handler{
		pool:    pool,
		sm:      sm,
		cfg:     cfg,
		storage: storage,
	}
}

// PasswordlessRegister handles instant account creation without passwords or OTPs
func (h *Handler) PasswordlessRegister(w http.ResponseWriter, r *http.Request) {
	var req PasswordlessRegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}

	req.CustomID = strings.TrimSpace(req.CustomID)
	req.DisplayName = strings.TrimSpace(req.DisplayName)

	if req.CustomID == "" {
		req.CustomID = GenerateRandomCustomID(req.DisplayName)
	}

	if !customIDRegex.MatchString(req.CustomID) {
		writeError(w, http.StatusBadRequest, "custom user ID must be 3-30 characters long and contain only letters, numbers, and underscores")
		return
	}

	if req.DisplayName == "" {
		req.DisplayName = req.CustomID
	}

	// Generate persistent device credential token
	rawDeviceToken, err := GenerateToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate device credential")
		return
	}
	deviceTokenHash := HashToken(rawDeviceToken)

	ctx := r.Context()
	query := `
		INSERT INTO users (username, custom_id, display_name, bio, auth_provider, auth_provider_id)
		VALUES ($1, $1, $2, $3, 'passwordless', $4)
		RETURNING id, custom_id, username, display_name, bio, avatar_key, auth_provider, created_at, updated_at;
	`

	var u User
	err = h.pool.QueryRow(ctx, query, req.CustomID, req.DisplayName, req.Bio, deviceTokenHash).
		Scan(&u.ID, &u.CustomID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarKey, &u.AuthProvider, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, fmt.Sprintf("the custom user ID '%s' is already taken", req.CustomID))
			return
		}
		observability.FromContext(ctx).Error("passwordless registration failed", "error", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Establish session
	ip := clientIP(r)
	ua := r.UserAgent()
	sessionToken, _, err := h.sm.CreateSession(ctx, u.ID, ip, ua)
	if err == nil {
		h.sm.SetSessionCookie(w, sessionToken)
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user":         u,
		"device_token": rawDeviceToken,
	})
}

// PasswordlessLogin logs in using a stored device token credential
func (h *Handler) PasswordlessLogin(w http.ResponseWriter, r *http.Request) {
	var req PasswordlessLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}

	req.CustomID = strings.TrimSpace(req.CustomID)
	req.DeviceToken = strings.TrimSpace(req.DeviceToken)

	if req.CustomID == "" || req.DeviceToken == "" {
		writeError(w, http.StatusBadRequest, "custom_id and device_token are required")
		return
	}

	tokenHash := HashToken(req.DeviceToken)
	ctx := r.Context()
	query := `
		SELECT id, custom_id, username, COALESCE(email, ''), display_name, bio, avatar_key, auth_provider, created_at, updated_at
		FROM users
		WHERE LOWER(custom_id) = LOWER($1) AND auth_provider = 'passwordless' AND auth_provider_id = $2;
	`

	var u User
	err := h.pool.QueryRow(ctx, query, req.CustomID, tokenHash).Scan(
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
		writeError(w, http.StatusUnauthorized, "invalid user ID or device token")
		return
	}

	if u.AvatarKey != nil && *u.AvatarKey != "" && h.storage != nil {
		u.AvatarURL = h.storage.PublicURL(*u.AvatarKey)
	}

	ip := clientIP(r)
	ua := r.UserAgent()
	sessionToken, _, err := h.sm.CreateSession(ctx, u.ID, ip, ua)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	h.sm.SetSessionCookie(w, sessionToken)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": u,
	})
}

// OAuthLogin handles passwordless sign-in and account creation via Google/Apple/OAuth
func (h *Handler) OAuthLogin(w http.ResponseWriter, r *http.Request) {
	var req OAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}

	req.Provider = strings.ToLower(strings.TrimSpace(req.Provider))
	req.ProviderUserID = strings.TrimSpace(req.ProviderUserID)
	if req.Provider == "" || req.ProviderUserID == "" {
		writeError(w, http.StatusBadRequest, "provider and provider_user_id are required")
		return
	}

	ctx := r.Context()

	// Check if user already exists with this OAuth account
	query := `
		SELECT id, custom_id, username, COALESCE(email, ''), display_name, bio, avatar_key, auth_provider, created_at, updated_at
		FROM users
		WHERE auth_provider = $1 AND auth_provider_id = $2;
	`

	var u User
	err := h.pool.QueryRow(ctx, query, req.Provider, req.ProviderUserID).Scan(
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

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		observability.FromContext(ctx).Error("oauth lookup error", "error", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Create user if not found
	if errors.Is(err, pgx.ErrNoRows) {
		customID := strings.TrimSpace(req.CustomID)
		if customID == "" {
			customID = GenerateRandomCustomID(req.DisplayName)
		}
		if !customIDRegex.MatchString(customID) {
			customID = GenerateRandomCustomID("traveler")
		}

		insertQuery := `
			INSERT INTO users (username, custom_id, email, display_name, auth_provider, auth_provider_id)
			VALUES ($1, $1, NULLIF($2, ''), $3, $4, $5)
			RETURNING id, custom_id, username, COALESCE(email, ''), display_name, bio, avatar_key, auth_provider, created_at, updated_at;
		`
		err = h.pool.QueryRow(ctx, insertQuery, customID, req.Email, req.DisplayName, req.Provider, req.ProviderUserID).
			Scan(&u.ID, &u.CustomID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarKey, &u.AuthProvider, &u.CreatedAt, &u.UpdatedAt)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				// Retry with random suffix
				customID = GenerateRandomCustomID("traveler")
				_ = h.pool.QueryRow(ctx, insertQuery, customID, req.Email, req.DisplayName, req.Provider, req.ProviderUserID).
					Scan(&u.ID, &u.CustomID, &u.Username, &u.Email, &u.DisplayName, &u.Bio, &u.AvatarKey, &u.AuthProvider, &u.CreatedAt, &u.UpdatedAt)
			}
		}
	}

	ip := clientIP(r)
	ua := r.UserAgent()
	sessionToken, _, err := h.sm.CreateSession(ctx, u.ID, ip, ua)
	if err == nil {
		h.sm.SetSessionCookie(w, sessionToken)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": u,
	})
}

// PasskeyRegisterStart provides WebAuthn challenge for biometric/security key registration
func (h *Handler) PasskeyRegisterStart(w http.ResponseWriter, r *http.Request) {
	challenge, err := GenerateChallenge()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate passkey challenge")
		return
	}

	var resp PasskeyRegisterStartResponse
	resp.Challenge = challenge
	resp.RP.Name = "Travel Doodles"
	resp.RP.ID = "traveldoodles.app"
	resp.Timeout = 60000
	resp.PubKeyCredParams = []struct {
		Type int `json:"type"`
		Alg  int `json:"alg"`
	}{
		{Type: 1, Alg: -7},   // ES256
		{Type: 1, Alg: -257}, // RS256
	}

	writeJSON(w, http.StatusOK, resp)
}

// PasskeyRegisterFinish completes passkey registration and persists credential
func (h *Handler) PasskeyRegisterFinish(w http.ResponseWriter, r *http.Request) {
	var req PasskeyRegisterFinishRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.CustomID = strings.TrimSpace(req.CustomID)
	if req.CustomID == "" {
		req.CustomID = GenerateRandomCustomID(req.DisplayName)
	}
	if !customIDRegex.MatchString(req.CustomID) {
		writeError(w, http.StatusBadRequest, "invalid custom user ID")
		return
	}
	if req.CredentialID == "" || req.PublicKey == "" {
		writeError(w, http.StatusBadRequest, "credential_id and public_key are required")
		return
	}

	ctx := r.Context()
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer tx.Rollback(ctx)

	// Create user
	insertUser := `
		INSERT INTO users (username, custom_id, display_name, bio, auth_provider, auth_provider_id)
		VALUES ($1, $1, $2, $3, 'passkey', $4)
		RETURNING id, custom_id, username, display_name, bio, avatar_key, auth_provider, created_at, updated_at;
	`
	var u User
	err = tx.QueryRow(ctx, insertUser, req.CustomID, req.DisplayName, req.Bio, req.CredentialID).
		Scan(&u.ID, &u.CustomID, &u.Username, &u.DisplayName, &u.Bio, &u.AvatarKey, &u.AuthProvider, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "this user ID is already registered")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create user account")
		return
	}

	// Store passkey credential
	insertCred := `
		INSERT INTO passkey_credentials (user_id, credential_id, public_key)
		VALUES ($1, $2, $3);
	`
	if _, err := tx.Exec(ctx, insertCred, u.ID, req.CredentialID, req.PublicKey); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save passkey credential")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	ip := clientIP(r)
	ua := r.UserAgent()
	sessionToken, _, err := h.sm.CreateSession(ctx, u.ID, ip, ua)
	if err == nil {
		h.sm.SetSessionCookie(w, sessionToken)
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user": u,
	})
}

// PasskeyLoginStart returns challenge for passkey authentication
func (h *Handler) PasskeyLoginStart(w http.ResponseWriter, r *http.Request) {
	challenge, err := GenerateChallenge()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate challenge")
		return
	}

	resp := PasskeyLoginStartResponse{
		Challenge: challenge,
		Timeout:   60000,
		RPID:      "traveldoodles.app",
	}

	writeJSON(w, http.StatusOK, resp)
}

// PasskeyLoginFinish verifies passkey and logs user in
func (h *Handler) PasskeyLoginFinish(w http.ResponseWriter, r *http.Request) {
	var req PasskeyLoginFinishRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	query := `
		SELECT u.id, u.custom_id, u.username, COALESCE(u.email, ''), u.display_name, u.bio, u.avatar_key, u.auth_provider, u.created_at, u.updated_at
		FROM passkey_credentials pc
		JOIN users u ON pc.user_id = u.id
		WHERE pc.credential_id = $1;
	`
	var u User
	err := h.pool.QueryRow(ctx, query, req.CredentialID).Scan(
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
		writeError(w, http.StatusUnauthorized, "invalid passkey credential")
		return
	}

	// Update last used timestamp
	_, _ = h.pool.Exec(ctx, `UPDATE passkey_credentials SET last_used_at = NOW() WHERE credential_id = $1;`, req.CredentialID)

	ip := clientIP(r)
	ua := r.UserAgent()
	sessionToken, _, err := h.sm.CreateSession(ctx, u.ID, ip, ua)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	h.sm.SetSessionCookie(w, sessionToken)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": u,
	})
}

// Register explicitly rejects password-based registrations
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusBadRequest, "password-based accounts are disabled. Please use passwordless registration (/api/v1/auth/passwordless/register) or OAuth (/api/v1/auth/oauth)")
}

// Login explicitly rejects password-based logins
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusBadRequest, "password-based logins are disabled. Please use passwordless login (/api/v1/auth/passwordless/login), OAuth (/api/v1/auth/oauth), or passkey")
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(h.cfg.SessionCookieName)
	if err == nil && cookie.Value != "" {
		_ = h.sm.RevokeSession(r.Context(), cookie.Value)
	}
	h.sm.ClearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "logged out successfully",
	})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	user := UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if user.AvatarKey != nil && *user.AvatarKey != "" && h.storage != nil {
		user.AvatarURL = h.storage.PublicURL(*user.AvatarKey)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": user,
	})
}

func clientIP(r *http.Request) string {
	xf := r.Header.Get("X-Forwarded-For")
	if xf != "" {
		parts := strings.Split(xf, ",")
		return strings.TrimSpace(parts[0])
	}
	xr := r.Header.Get("X-Real-IP")
	if xr != "" {
		return strings.TrimSpace(xr)
	}
	return strings.Split(r.RemoteAddr, ":")[0]
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}
