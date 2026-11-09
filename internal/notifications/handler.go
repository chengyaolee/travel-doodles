package notifications

import (
	"encoding/json"
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

func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := 20
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil {
			limit = l
		}
	}

	notifs, err := h.service.ListNotifications(r.Context(), currentUser.ID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch notifications")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"notifications": notifs,
	})
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	notifID := r.PathValue("id")
	if notifID == "" {
		writeError(w, http.StatusBadRequest, "notification id is required")
		return
	}

	err := h.service.MarkRead(r.Context(), currentUser.ID, notifID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to mark notification as read")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "notification marked as read",
	})
}

func (h *Handler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	err := h.service.MarkAllRead(r.Context(), currentUser.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to mark all as read")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "all notifications marked as read",
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
