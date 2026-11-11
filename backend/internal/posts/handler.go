package posts

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"travel-doodles/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListPosts(w http.ResponseWriter, r *http.Request) {
	cursor := r.URL.Query().Get("cursor")
	limitStr := r.URL.Query().Get("limit")
	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil {
			limit = l
		}
	}

	var viewerID string
	if u := auth.UserFromContext(r.Context()); u != nil {
		viewerID = u.ID
	}

	res, err := h.service.ListPublicPosts(r.Context(), viewerID, cursor, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list posts")
		return
	}

	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) CreatePost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	post, err := h.service.CreatePost(r.Context(), user.ID, req)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to create post")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"post": post,
	})
}

func (h *Handler) GetPost(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
	if postID == "" {
		writeError(w, http.StatusBadRequest, "post id is required")
		return
	}

	var viewerID string
	if u := auth.UserFromContext(r.Context()); u != nil {
		viewerID = u.ID
	}

	post, err := h.service.GetPostByID(r.Context(), postID, viewerID)
	if err != nil {
		if errors.Is(err, ErrPostNotFound) {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		if errors.Is(err, ErrForbidden) {
			writeError(w, http.StatusForbidden, "access denied")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to fetch post")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"post": post,
	})
}

func (h *Handler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	postID := r.PathValue("id")
	if postID == "" {
		writeError(w, http.StatusBadRequest, "post id is required")
		return
	}

	var req UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.service.UpdatePost(r.Context(), postID, user.ID, req)
	if err != nil {
		if errors.Is(err, ErrPostNotFound) {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		if errors.Is(err, ErrForbidden) {
			writeError(w, http.StatusForbidden, "only the author can edit this post")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update post")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"post": updated,
	})
}

func (h *Handler) DeletePost(w http.ResponseWriter, r *http.Request) {
	user := auth.UserFromContext(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	postID := r.PathValue("id")
	if postID == "" {
		writeError(w, http.StatusBadRequest, "post id is required")
		return
	}

	err := h.service.DeletePost(r.Context(), postID, user.ID)
	if err != nil {
		if errors.Is(err, ErrPostNotFound) {
			writeError(w, http.StatusNotFound, "post not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to delete post")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "post deleted successfully",
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
