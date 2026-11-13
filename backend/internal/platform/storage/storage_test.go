package storage

import (
	"context"
	"os"
	"testing"
	"time"
)

func TestLocalStorage_Operations(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "storage_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	secret := "test-secret-key-32-bytes-long-123456"
	store, err := NewLocalStorage(tempDir, "http://localhost:8080/media", secret)
	if err != nil {
		t.Fatalf("failed to create local storage: %v", err)
	}

	ctx := context.Background()
	key := "uploads/2026/test_photo.jpg"
	content := []byte("fake jpeg content header and pixels")
	contentType := "image/jpeg"

	// 1. Put object
	err = store.PutObject(ctx, key, content, contentType)
	if err != nil {
		t.Fatalf("PutObject failed: %v", err)
	}

	// 2. Get object
	got, err := store.GetObject(ctx, key)
	if err != nil {
		t.Fatalf("GetObject failed: %v", err)
	}
	if string(got) != string(content) {
		t.Errorf("expected %s, got %s", content, got)
	}

	// 3. Head object
	size, ctype, err := store.HeadObject(ctx, key)
	if err != nil {
		t.Fatalf("HeadObject failed: %v", err)
	}
	if size != int64(len(content)) {
		t.Errorf("expected size %d, got %d", len(content), size)
	}
	if ctype == "" {
		t.Errorf("expected non-empty content type")
	}

	// 4. Presigned upload URL & verification
	uploadURL, err := store.GeneratePresignedUploadURL(ctx, key, contentType, 10*time.Minute)
	if err != nil {
		t.Fatalf("GeneratePresignedUploadURL failed: %v", err)
	}
	if uploadURL == "" {
		t.Errorf("expected non-empty upload URL")
	}

	// 5. Delete object
	err = store.DeleteObject(ctx, key)
	if err != nil {
		t.Fatalf("DeleteObject failed: %v", err)
	}

	// 6. Verify not found after delete
	_, err = store.GetObject(ctx, key)
	if err != ErrObjectNotFound {
		t.Errorf("expected ErrObjectNotFound, got: %v", err)
	}

	// 7. Verify PublicURL handling for local keys, remote URLs, and data URLs
	pubURL := store.PublicURL(key)
	expectedPub := "http://localhost:8080/media/" + key
	if pubURL != expectedPub {
		t.Errorf("expected PublicURL %s, got %s", expectedPub, pubURL)
	}

	remoteURL := "https://images.unsplash.com/photo-12345"
	if got := store.PublicURL(remoteURL); got != remoteURL {
		t.Errorf("expected untouched remote URL %s, got %s", remoteURL, got)
	}

	dataURL := "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
	if got := store.PublicURL(dataURL); got != dataURL {
		t.Errorf("expected untouched data URL, got %s", got)
	}
}

func TestLocalStorage_PathTraversalProtection(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "storage_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	store, _ := NewLocalStorage(tempDir, "http://localhost:8080/media", "secret")
	ctx := context.Background()

	maliciousKey := "../../../etc/passwd"
	err = store.PutObject(ctx, maliciousKey, []byte("attack"), "text/plain")
	if err != ErrInvalidKey {
		t.Errorf("expected ErrInvalidKey on path traversal attempt, got %v", err)
	}
}
