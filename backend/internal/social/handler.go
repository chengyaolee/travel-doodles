package social

import (
	"encoding/json"
	"errors"
	"net/http"

	"travel-doodles/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Follow(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	targetID := r.PathValue("id")
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "target user id is required")
		return
	}

	err := h.service.FollowUser(r.Context(), currentUser.ID, targetID)
	if err != nil {
		if errors.Is(err, ErrCannotFollowSelf) {
			writeError(w, http.StatusBadRequest, "cannot follow yourself")
			return
		}
		if errors.Is(err, ErrBlocked) {
			writeError(w, http.StatusForbidden, "cannot follow this user")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to follow user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "followed successfully",
	})
}

func (h *Handler) Unfollow(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	targetID := r.PathValue("id")
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "target user id is required")
		return
	}

	err := h.service.UnfollowUser(r.Context(), currentUser.ID, targetID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to unfollow user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "unfollowed successfully",
	})
}

func (h *Handler) Block(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	targetID := r.PathValue("id")
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "target user id is required")
		return
	}

	err := h.service.BlockUser(r.Context(), currentUser.ID, targetID)
	if err != nil {
		if errors.Is(err, ErrCannotBlockSelf) {
			writeError(w, http.StatusBadRequest, "cannot block yourself")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to block user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "user blocked successfully",
	})
}

func (h *Handler) Unblock(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	targetID := r.PathValue("id")
	if targetID == "" {
		writeError(w, http.StatusBadRequest, "target user id is required")
		return
	}

	err := h.service.UnblockUser(r.Context(), currentUser.ID, targetID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to unblock user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "user unblocked successfully",
	})
}

func (h *Handler) Like(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	postID := r.PathValue("id")
	if postID == "" {
		writeError(w, http.StatusBadRequest, "post id is required")
		return
	}

	err := h.service.LikePost(r.Context(), currentUser.ID, postID)
	if err != nil {
		if errors.Is(err, ErrTargetNotFound) {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to like post")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "post liked",
	})
}

func (h *Handler) Unlike(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	postID := r.PathValue("id")
	if postID == "" {
		writeError(w, http.StatusBadRequest, "post id is required")
		return
	}

	err := h.service.UnlikePost(r.Context(), currentUser.ID, postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to unlike post")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "post unliked",
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
