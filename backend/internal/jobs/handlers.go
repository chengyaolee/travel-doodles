package jobs

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/media"
	"travel-doodles/internal/platform/storage"
)

type ProcessImagePayload struct {
	PostID    string `json:"post_id"`
	MediaID   string `json:"media_id"`
	ObjectKey string `json:"object_key"`
}

// NewProcessImageHandler returns a handler that downloads an uploaded image,
// validates against decompression bombs, strips EXIF GPS metadata, generates a thumbnail,
// uploads the thumbnail to storage, and updates the database record
func NewProcessImageHandler(pool *pgxpool.Pool, store storage.StorageService) JobHandler {
	return func(ctx context.Context, payload json.RawMessage) error {
		var p ProcessImagePayload
		if err := json.Unmarshal(payload, &p); err != nil {
			return fmt.Errorf("failed to parse process_image payload: %w", err)
		}

		slog.Info("executing image processing job", "post_id", p.PostID, "media_id", p.MediaID, "key", p.ObjectKey)

		// 1. Fetch raw image from storage
		rawBytes, err := store.GetObject(ctx, p.ObjectKey)
		if err != nil {
			return fmt.Errorf("failed to fetch raw image from storage: %w", err)
		}

		// 2. Process image (validates bounds, strips EXIF GPS, creates thumbnail)
		processed, err := media.ProcessAndSanitizeImage(rawBytes)
		if err != nil {
			return fmt.Errorf("image processing failed: %w", err)
		}

		// 3. Generate thumbnail object key: replace extension with _thumb.jpg
		thumbKey := strings.TrimSuffix(p.ObjectKey, ".jpg")
		thumbKey = strings.TrimSuffix(thumbKey, ".png")
		thumbKey = strings.TrimSuffix(thumbKey, ".webp") + "_thumb.jpg"

		// 4. Upload sanitized thumbnail to storage
		if err := store.PutObject(ctx, thumbKey, processed.Thumbnail, "image/jpeg"); err != nil {
			return fmt.Errorf("failed to store thumbnail: %w", err)
		}

		// Optionally replace original with EXIF-stripped version
		if err := store.PutObject(ctx, p.ObjectKey, processed.OriginalData, processed.ContentType); err != nil {
			slog.Warn("failed to replace original with sanitized image", "error", err)
		}

		// 5. Update post_media record with thumbnail key and dimensions
		updateQuery := `
			UPDATE post_media
			SET thumbnail_key = $1, width = $2, height = $3
			WHERE id = $4;
		`
		_, err = pool.Exec(ctx, updateQuery, thumbKey, processed.Width, processed.Height, p.MediaID)
		if err != nil {
			return fmt.Errorf("failed to update post_media record: %w", err)
		}

		slog.Info("image processed and thumbnail generated successfully",
			"post_id", p.PostID,
			"media_id", p.MediaID,
			"thumb_key", thumbKey,
			"dimensions", fmt.Sprintf("%dx%d", processed.Width, processed.Height),
		)

		return nil
	}
}

// NewCleanupExpiredUploadsHandler cleans up pending uploads that were never confirmed
func NewCleanupExpiredUploadsHandler(pool *pgxpool.Pool, store storage.StorageService) JobHandler {
	return func(ctx context.Context, payload json.RawMessage) error {
		query := `
			DELETE FROM media_uploads
			WHERE upload_status = 'pending' AND expires_at < NOW() - INTERVAL '1 day'
			RETURNING object_key;
		`
		rows, err := pool.Query(ctx, query)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var objKey string
			if err := rows.Scan(&objKey); err == nil {
				_ = store.DeleteObject(ctx, objKey)
			}
		}

		return nil
	}
}
