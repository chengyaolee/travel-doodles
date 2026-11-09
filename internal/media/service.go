package media

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/platform/storage"
)

const (
	MaxUploadSizeBytes = 20 * 1024 * 1024 // 20 MB
	UploadExpiryMinutes = 15
)

var (
	ErrInvalidContentType = errors.New("invalid content type; allowed formats: image/jpeg, image/png, image/webp")
	ErrFileTooLarge        = errors.New("file exceeds maximum allowed size of 20MB")
	ErrUploadNotFound      = errors.New("media upload record not found")
	ErrObjectNotUploaded   = errors.New("object has not been uploaded to storage yet")
)

type UploadAuthResponse struct {
	UploadID   string    `json:"upload_id"`
	UploadURL  string    `json:"upload_url"`
	ObjectKey  string    `json:"object_key"`
	PublicURL  string    `json:"public_url"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type UploadRecord struct {
	ID           string    `json:"id"`
	OwnerID      string    `json:"owner_id"`
	ObjectKey    string    `json:"object_key"`
	UploadStatus string    `json:"upload_status"`
	FileSize     int64     `json:"file_size"`
	ContentType  string    `json:"content_type"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
}

type Service struct {
	pool    *pgxpool.Pool
	storage storage.StorageService
}

func NewService(pool *pgxpool.Pool, storage storage.StorageService) *Service {
	return &Service{
		pool:    pool,
		storage: storage,
	}
}

func (s *Service) RequestUpload(ctx context.Context, ownerID, contentType string, fileSize int64) (*UploadAuthResponse, error) {
	contentType = strings.ToLower(strings.TrimSpace(contentType))

	var ext string
	switch contentType {
	case "image/jpeg", "image/jpg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	default:
		return nil, ErrInvalidContentType
	}

	if fileSize > MaxUploadSizeBytes {
		return nil, ErrFileTooLarge
	}

	b := make([]byte, 16)
	_, _ = rand.Read(b)
	fileUUID := hex.EncodeToString(b)
	objectKey := fmt.Sprintf("uploads/%s/%s%s", ownerID, fileUUID, ext)

	expiryDuration := UploadExpiryMinutes * time.Minute
	expiresAt := time.Now().Add(expiryDuration)

	// Persist pending upload record
	insertQuery := `
		INSERT INTO media_uploads (owner_id, object_key, upload_status, file_size, content_type, expires_at)
		VALUES ($1, $2, 'pending', $3, $4, $5)
		RETURNING id;
	`
	var uploadID string
	err := s.pool.QueryRow(ctx, insertQuery, ownerID, objectKey, fileSize, contentType, expiresAt).Scan(&uploadID)
	if err != nil {
		return nil, fmt.Errorf("failed to create upload record: %w", err)
	}

	uploadURL, err := s.storage.GeneratePresignedUploadURL(ctx, objectKey, contentType, expiryDuration)
	if err != nil {
		return nil, fmt.Errorf("failed to generate presigned upload url: %w", err)
	}

	return &UploadAuthResponse{
		UploadID:  uploadID,
		UploadURL: uploadURL,
		ObjectKey: objectKey,
		PublicURL: s.storage.PublicURL(objectKey),
		ExpiresAt: expiresAt,
	}, nil
}

func (s *Service) CompleteUpload(ctx context.Context, ownerID, uploadID string) (*UploadRecord, error) {
	// 1. Fetch pending upload
	selectQuery := `
		SELECT id, owner_id, object_key, upload_status, file_size, content_type, expires_at, created_at
		FROM media_uploads
		WHERE id = $1 AND owner_id = $2;
	`

	var rec UploadRecord
	err := s.pool.QueryRow(ctx, selectQuery, uploadID, ownerID).Scan(
		&rec.ID,
		&rec.OwnerID,
		&rec.ObjectKey,
		&rec.UploadStatus,
		&rec.FileSize,
		&rec.ContentType,
		&rec.ExpiresAt,
		&rec.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUploadNotFound
		}
		return nil, err
	}

	// 2. Check storage for object existence
	size, actualContentType, err := s.storage.HeadObject(ctx, rec.ObjectKey)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrObjectNotUploaded, err)
	}

	// 3. Mark completed in DB
	updateQuery := `
		UPDATE media_uploads
		SET upload_status = 'completed', file_size = $2, content_type = $3
		WHERE id = $1;
	`
	_, err = s.pool.Exec(ctx, updateQuery, uploadID, size, actualContentType)
	if err != nil {
		return nil, err
	}

	rec.UploadStatus = "completed"
	rec.FileSize = size
	rec.ContentType = actualContentType

	return &rec, nil
}
