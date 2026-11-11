package comments

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"travel-doodles/internal/auth"
)

type CreateCommentRequest struct {
	Content  string  `json:"content"`
	ParentID *string `json:"parent_id,omitempty"`
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListComments(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
	if postID == "" {
		writeError(w, http.StatusBadRequest, "post id is required")
		return
	}

	cursor := r.URL.Query().Get("cursor")
	limit := 20
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil {
			limit = l
		}
	}

	res, err := h.service.ListComments(r.Context(), postID, cursor, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list comments")
		return
	}

	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) CreateComment(w http.ResponseWriter, r *http.Request) {
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

	var req CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	comment, err := h.service.CreateComment(r.Context(), postID, currentUser.ID, req.ParentID, req.Content)
	if err != nil {
		if errors.Is(err, ErrPostNotFound) {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"comment": comment,
	})
}

func (h *Handler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	commentID := r.PathValue("id")
	if commentID == "" {
		writeError(w, http.StatusBadRequest, "comment id is required")
		return
	}

	err := h.service.DeleteComment(r.Context(), commentID, currentUser.ID)
	if err != nil {
		if errors.Is(err, ErrCommentNotFound) {
			writeError(w, http.StatusNotFound, "comment not found")
			return
		}
		if errors.Is(err, ErrForbidden) {
			writeError(w, http.StatusForbidden, "not authorized to delete this comment")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete comment")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "comment deleted",
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
