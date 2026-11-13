package friends

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

// AddFriendByID handles typing in another user's custom user ID
func (h *Handler) AddFriendByID(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req AddFriendByIDRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	friend, err := h.service.AddFriendByCustomID(r.Context(), currentUser.ID, req.CustomID)
	if err != nil {
		switch {
		case errors.Is(err, ErrUserNotFound):
			writeError(w, http.StatusNotFound, err.Error())
		case errors.Is(err, ErrCannotFriendSelf):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, ErrAlreadyFriends):
			writeError(w, http.StatusConflict, err.Error())
		case errors.Is(err, ErrBlocked):
			writeError(w, http.StatusForbidden, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "failed to add friend")
		}
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "friend added successfully",
		"friend":  friend,
	})
}

// CreateInvite generates a shareable link that others can click to become friends
func (h *Handler) CreateInvite(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateInviteRequest
	if r.Body != nil && r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	invite, err := h.service.CreateInviteLink(r.Context(), currentUser.ID, req.MaxUses, req.ExpireHours)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create friend invite link")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"invite": invite,
	})
}

// GetInvite inspects an invite link before accepting
func (h *Handler) GetInvite(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "invite code is required")
		return
	}

	invite, err := h.service.GetInvite(r.Context(), code)
	if err != nil {
		switch {
		case errors.Is(err, ErrInviteNotFound):
			writeError(w, http.StatusNotFound, err.Error())
		case errors.Is(err, ErrInviteExpired) || errors.Is(err, ErrInviteExhausted):
			writeError(w, http.StatusGone, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "failed to fetch invite")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"invite": invite,
	})
}

// AcceptInvite accepts an invite link and establishes mutual friendship
func (h *Handler) AcceptInvite(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	code := r.PathValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "invite code is required")
		return
	}

	friend, err := h.service.AcceptInvite(r.Context(), currentUser.ID, code)
	if err != nil {
		switch {
		case errors.Is(err, ErrInviteNotFound):
			writeError(w, http.StatusNotFound, err.Error())
		case errors.Is(err, ErrInviteExpired) || errors.Is(err, ErrInviteExhausted):
			writeError(w, http.StatusGone, err.Error())
		case errors.Is(err, ErrCannotAcceptOwnInvite):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, ErrBlocked):
			writeError(w, http.StatusForbidden, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "failed to accept invite")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "friend connected successfully",
		"friend":  friend,
	})
}

// ListFriends lists all mutual friends
func (h *Handler) ListFriends(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := 50
	offset := 0
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil {
			limit = l
		}
	}
	if oStr := r.URL.Query().Get("offset"); oStr != "" {
		if o, err := strconv.Atoi(oStr); err == nil {
			offset = o
		}
	}

	friendList, err := h.service.ListFriends(r.Context(), currentUser.ID, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list friends")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"friends": friendList,
		"count":   len(friendList),
	})
}

// RemoveFriend deletes a mutual friendship
func (h *Handler) RemoveFriend(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	friendID := r.PathValue("id")
	if friendID == "" {
		writeError(w, http.StatusBadRequest, "friend id is required")
		return
	}

	err := h.service.RemoveFriend(r.Context(), currentUser.ID, friendID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove friend")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "friend removed successfully",
	})
}

// SearchUsers searches travelers by handle or name
func (h *Handler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	currentUserID := ""
	if currentUser != nil {
		currentUserID = currentUser.ID
	}

	q := r.URL.Query().Get("q")
	results, err := h.service.SearchUsers(r.Context(), currentUserID, q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to search travelers")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"users": results,
	})
}

// SendFriendRequest sends a request to another traveler
func (h *Handler) SendFriendRequest(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req SendFriendRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	target := req.CustomID
	if target == "" {
		target = req.TargetID
	}

	reqItem, targetFriend, err := h.service.SendFriendRequest(r.Context(), currentUser.ID, target)
	if err != nil {
		switch {
		case errors.Is(err, ErrUserNotFound):
			writeError(w, http.StatusNotFound, err.Error())
		case errors.Is(err, ErrCannotFriendSelf):
			writeError(w, http.StatusBadRequest, err.Error())
		case errors.Is(err, ErrAlreadyFriends):
			writeError(w, http.StatusConflict, err.Error())
		case errors.Is(err, ErrRequestAlreadySent):
			writeError(w, http.StatusConflict, err.Error())
		case errors.Is(err, ErrBlocked):
			writeError(w, http.StatusForbidden, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "failed to send friend request")
		}
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "friend request sent successfully",
		"request": reqItem,
		"target":  targetFriend,
	})
}

// ListFriendRequests returns pending incoming and outgoing requests
func (h *Handler) ListFriendRequests(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	incoming, outgoing, err := h.service.ListFriendRequests(r.Context(), currentUser.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list friend requests")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"incoming": incoming,
		"outgoing": outgoing,
	})
}

// AcceptFriendRequest accepts an incoming request
func (h *Handler) AcceptFriendRequest(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	reqID := r.PathValue("id")
	if reqID == "" {
		writeError(w, http.StatusBadRequest, "request id is required")
		return
	}

	friend, err := h.service.AcceptFriendRequest(r.Context(), currentUser.ID, reqID)
	if err != nil {
		switch {
		case errors.Is(err, ErrRequestNotFound):
			writeError(w, http.StatusNotFound, err.Error())
		case errors.Is(err, ErrUnauthorizedRequest):
			writeError(w, http.StatusForbidden, err.Error())
		default:
			writeError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "friend request accepted successfully",
		"friend":  friend,
	})
}

// DeclineFriendRequest declines an incoming request
func (h *Handler) DeclineFriendRequest(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	reqID := r.PathValue("id")
	if reqID == "" {
		writeError(w, http.StatusBadRequest, "request id is required")
		return
	}

	err := h.service.DeclineFriendRequest(r.Context(), currentUser.ID, reqID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "friend request declined",
	})
}

// CancelFriendRequest cancels an outgoing request
func (h *Handler) CancelFriendRequest(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	reqID := r.PathValue("id")
	if reqID == "" {
		writeError(w, http.StatusBadRequest, "request id is required")
		return
	}

	err := h.service.CancelFriendRequest(r.Context(), currentUser.ID, reqID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "friend request cancelled",
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
