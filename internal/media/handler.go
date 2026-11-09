package media

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"travel-doodles/internal/auth"
	"travel-doodles/internal/platform/storage"
)

type RequestUploadPayload struct {
	ContentType string `json:"content_type"`
	FileSize    int64  `json:"file_size"`
}

type Handler struct {
	service *Service
	storage storage.StorageService
}

func NewHandler(service *Service, storage storage.StorageService) *Handler {
	return &Handler{
		service: service,
		storage: storage,
	}
}

func (h *Handler) RequestUpload(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req RequestUploadPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	resp, err := h.service.RequestUpload(r.Context(), currentUser.ID, req.ContentType, req.FileSize)
	if err != nil {
		if errors.Is(err, ErrInvalidContentType) || errors.Is(err, ErrFileTooLarge) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to generate upload authorization")
		return
	}

	writeJSON(w, http.StatusCreated, resp)
}

func (h *Handler) CompleteUpload(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.UserFromContext(r.Context())
	if currentUser == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	uploadID := r.PathValue("id")
	if uploadID == "" {
		writeError(w, http.StatusBadRequest, "upload id is required")
		return
	}

	rec, err := h.service.CompleteUpload(r.Context(), currentUser.ID, uploadID)
	if err != nil {
		if errors.Is(err, ErrUploadNotFound) {
			writeError(w, http.StatusNotFound, "upload record not found")
			return
		}
		if errors.Is(err, ErrObjectNotUploaded) {
			writeError(w, http.StatusBadRequest, "object has not been uploaded to storage yet")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to verify upload")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"upload": rec,
	})
}

// HandleLocalUpload provides direct file upload handler for LocalStorage mode
func (h *Handler) HandleLocalUpload(w http.ResponseWriter, r *http.Request) {
	localStorage, ok := h.storage.(*storage.LocalStorage)
	if !ok {
		writeError(w, http.StatusBadRequest, "direct local upload not enabled (using remote S3)")
		return
	}

	q := r.URL.Query()
	key := q.Get("key")
	contentType := q.Get("content_type")
	expiresStr := q.Get("expires")
	signature := q.Get("signature")

	expires, _ := strconv.ParseInt(expiresStr, 10, 64)
	if !localStorage.VerifySignature(key, contentType, expires, signature) {
		writeError(w, http.StatusForbidden, "invalid or expired upload signature")
		return
	}

	// Read body (up to 20MB)
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, MaxUploadSizeBytes))
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read upload payload or exceeded size limit")
		return
	}

	if err := localStorage.PutObject(r.Context(), key, body, contentType); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to store file")
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"uploaded"}`))
}

// HandleLocalServe serves stored files for LocalStorage mode
func (h *Handler) HandleLocalServe(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimPrefix(r.URL.Path, "/media/files/")
	if key == "" {
		writeError(w, http.StatusBadRequest, "missing object key")
		return
	}

	data, err := h.storage.GetObject(r.Context(), key)
	if err != nil {
		if errors.Is(err, storage.ErrObjectNotFound) {
			writeError(w, http.StatusNotFound, "file not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	// Cache public assets in browser for 7 days
	w.Header().Set("Cache-Control", "public, max-age=604800, immutable")
	contentType := http.DetectContentType(data)
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
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
