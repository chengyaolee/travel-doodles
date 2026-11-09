package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/mail"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/observability"
	"travel-doodles/internal/platform/storage"
)

var (
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)
)

type RegisterRequest struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Bio         string `json:"bio"`
}

type LoginRequest struct {
	Login    string `json:"login"` // can be username or email
	Password string `json:"password"`
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

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.DisplayName = strings.TrimSpace(req.DisplayName)

	if !usernameRegex.MatchString(req.Username) {
		writeError(w, http.StatusBadRequest, "username must be 3-30 characters long and contain only letters, numbers, and underscores")
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		writeError(w, http.StatusBadRequest, "invalid email address")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters long")
		return
	}
	if len(req.DisplayName) == 0 {
		req.DisplayName = req.Username
	}

	// Hash password using Argon2id
	hashedPassword, err := HashPassword(req.Password, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to secure password")
		return
	}

	ctx := r.Context()
	query := `
		INSERT INTO users (username, email, password_hash, display_name, bio)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at;
	`

	var u User
	u.Username = req.Username
	u.Email = req.Email
	u.DisplayName = req.DisplayName
	u.Bio = req.Bio

	err = h.pool.QueryRow(ctx, query, req.Username, req.Email, hashedPassword, req.DisplayName, req.Bio).
		Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // Unique violation
			if strings.Contains(pgErr.ConstraintName, "username") {
				writeError(w, http.StatusConflict, "username is already taken")
				return
			}
			if strings.Contains(pgErr.ConstraintName, "email") {
				writeError(w, http.StatusConflict, "email is already registered")
				return
			}
		}
		observability.FromContext(ctx).Error("user registration failed", "error", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	// Create initial session
	ip := clientIP(r)
	ua := r.UserAgent()
	token, _, err := h.sm.CreateSession(ctx, u.ID, ip, ua)
	if err == nil {
		h.sm.SetSessionCookie(w, token)
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user": u,
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}

	req.Login = strings.TrimSpace(req.Login)
	if req.Login == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "login and password are required")
		return
	}

	ctx := r.Context()
	query := `
		SELECT id, username, email, password_hash, display_name, bio, avatar_key, created_at, updated_at
		FROM users
		WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1);
	`

	var u User
	err := h.pool.QueryRow(ctx, query, req.Login).Scan(
		&u.ID,
		&u.Username,
		&u.Email,
		&u.PasswordHash,
		&u.DisplayName,
		&u.Bio,
		&u.AvatarKey,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		// Timing-safe constant comparison or generic 401
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	valid, err := VerifyPassword(req.Password, u.PasswordHash)
	if err != nil || !valid {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	// Attach avatar URL if key present
	if u.AvatarKey != nil && *u.AvatarKey != "" && h.storage != nil {
		u.AvatarURL = h.storage.PublicURL(*u.AvatarKey)
	}

	// Create session
	ip := clientIP(r)
	ua := r.UserAgent()
	token, _, err := h.sm.CreateSession(ctx, u.ID, ip, ua)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	h.sm.SetSessionCookie(w, token)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": u,
	})
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
