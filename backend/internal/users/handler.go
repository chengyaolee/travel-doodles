package users

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"travel-doodles/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	username := r.PathValue("username")
	if username == "" {
		writeError(w, http.StatusBadRequest, "username is required")
		return
	}

	var viewerID string
	if u := auth.UserFromContext(r.Context()); u != nil {
		viewerID = u.ID
	}

	profile, err := h.service.GetProfile(r.Context(), username, viewerID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			writeError(w, http.StatusNotFound, "user not found")
			return
		}
		if errors.Is(err, ErrForbidden) {
			writeError(w, http.StatusForbidden, "user profile unavailable")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to get user profile")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"profile": profile,
	})
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	username := r.PathValue("username")
	if !strings.EqualFold(currentUser.Username, username) {
		writeError(w, http.StatusForbidden, "cannot modify another user's profile")
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.service.UpdateProfile(r.Context(), currentUser.ID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update profile")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": updated,
	})
}

type UpdateCustomIDRequest struct {
	CustomID string `json:"custom_id"`
}

func (h *Handler) UpdateCustomID(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req UpdateCustomIDRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	err := h.service.UpdateCustomID(r.Context(), currentUser.ID, req.CustomID)
	if err != nil {
		if errors.Is(err, ErrCustomIDTaken) || errors.Is(err, ErrInvalidCustomID) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update user ID")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message":   "user ID updated successfully",
		"custom_id": strings.TrimSpace(req.CustomID),
	})
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
