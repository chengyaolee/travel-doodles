package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"travel-doodles/internal/platform/config"
)

var (
	ErrObjectNotFound = errors.New("storage: object not found")
	ErrInvalidKey     = errors.New("storage: invalid object key")
)

type StorageService interface {
	GeneratePresignedUploadURL(ctx context.Context, objectKey, contentType string, expiry time.Duration) (string, error)
	GeneratePresignedDownloadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error)
	PublicURL(objectKey string) string
	PutObject(ctx context.Context, objectKey string, data []byte, contentType string) error
	GetObject(ctx context.Context, objectKey string) ([]byte, error)
	DeleteObject(ctx context.Context, objectKey string) error
	HeadObject(ctx context.Context, objectKey string) (int64, string, error)
}

// NewStorageService creates either a LocalStorage or S3Storage service based on configuration
func NewStorageService(cfg *config.Config) (StorageService, error) {
	if cfg.StorageType == "s3" {
		return NewS3Storage(cfg)
	}
	return NewLocalStorage(cfg.StorageLocalDir, cfg.StoragePublicURL, cfg.SessionSecret)
}

// LocalStorage implements StorageService using local filesystem and signed HMAC tokens
type LocalStorage struct {
	baseDir    string
	publicURL  string
	signingKey []byte
}

func NewLocalStorage(baseDir, publicURL, secret string) (*LocalStorage, error) {
	cleanDir := filepath.Clean(baseDir)
	if err := os.MkdirAll(cleanDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create local storage directory: %w", err)
	}
	return &LocalStorage{
		baseDir:    cleanDir,
		publicURL:  strings.TrimRight(publicURL, "/"),
		signingKey: []byte(secret),
	}, nil
}

func (l *LocalStorage) sanitizeKey(key string) (string, error) {
	clean := filepath.Clean(key)
	if strings.Contains(clean, "..") || strings.HasPrefix(clean, "/") || strings.HasPrefix(clean, "\\") {
		return "", ErrInvalidKey
	}
	return clean, nil
}

func (l *LocalStorage) filePath(key string) (string, error) {
	cleanKey, err := l.sanitizeKey(key)
	if err != nil {
		return "", err
	}
	return filepath.Join(l.baseDir, cleanKey), nil
}

func (l *LocalStorage) GeneratePresignedUploadURL(ctx context.Context, objectKey, contentType string, expiry time.Duration) (string, error) {
	cleanKey, err := l.sanitizeKey(objectKey)
	if err != nil {
		return "", err
	}

	exp := time.Now().Add(expiry).Unix()
	sig := l.signToken(cleanKey, contentType, exp)

	q := url.Values{}
	q.Set("key", cleanKey)
	q.Set("content_type", contentType)
	q.Set("expires", fmt.Sprintf("%d", exp))
	q.Set("signature", sig)

	return fmt.Sprintf("%s/upload?%s", l.publicURL, q.Encode()), nil
}

func (l *LocalStorage) GeneratePresignedDownloadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	cleanKey, err := l.sanitizeKey(objectKey)
	if err != nil {
		return "", err
	}

	exp := time.Now().Add(expiry).Unix()
	sig := l.signToken(cleanKey, "", exp)

	q := url.Values{}
	q.Set("key", cleanKey)
	q.Set("expires", fmt.Sprintf("%d", exp))
	q.Set("signature", sig)

	return fmt.Sprintf("%s/download?%s", l.publicURL, q.Encode()), nil
}

func (l *LocalStorage) VerifySignature(key, contentType string, expires int64, signature string) bool {
	if time.Now().Unix() > expires {
		return false
	}
	expected := l.signToken(key, contentType, expires)
	return hmac.Equal([]byte(expected), []byte(signature))
}

func (l *LocalStorage) signToken(key, contentType string, expires int64) string {
	mac := hmac.New(sha256.New, l.signingKey)
	msg := fmt.Sprintf("%s:%s:%d", key, contentType, expires)
	mac.Write([]byte(msg))
	return hex.EncodeToString(mac.Sum(nil))
}

func (l *LocalStorage) PublicURL(objectKey string) string {
	if objectKey == "" {
		return ""
	}
	if strings.HasPrefix(objectKey, "http://") || strings.HasPrefix(objectKey, "https://") || strings.HasPrefix(objectKey, "data:") {
		return objectKey
	}
	cleanKey, err := l.sanitizeKey(objectKey)
	if err != nil {
		return ""
	}
	return fmt.Sprintf("%s/%s", l.publicURL, cleanKey)
}

func (l *LocalStorage) PutObject(ctx context.Context, objectKey string, data []byte, contentType string) error {
	path, err := l.filePath(objectKey)
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory: %w", err)
	}

	// Write atomically using a temporary file
	tmpFile, err := os.CreateTemp(dir, "upload-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmpFile.Name()
	defer os.Remove(tmpName)

	if _, err := tmpFile.Write(data); err != nil {
		_ = tmpFile.Close()
		return err
	}
	if err := tmpFile.Close(); err != nil {
		return err
	}

	return os.Rename(tmpName, path)
}

func (l *LocalStorage) GetObject(ctx context.Context, objectKey string) ([]byte, error) {
	path, err := l.filePath(objectKey)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return nil, ErrObjectNotFound
	}
	return data, err
}

func (l *LocalStorage) DeleteObject(ctx context.Context, objectKey string) error {
	path, err := l.filePath(objectKey)
	if err != nil {
		return err
	}

	err = os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (l *LocalStorage) HeadObject(ctx context.Context, objectKey string) (int64, string, error) {
	path, err := l.filePath(objectKey)
	if err != nil {
		return 0, "", err
	}

	fi, err := os.Stat(path)
	if os.IsNotExist(err) {
		return 0, "", ErrObjectNotFound
	}
	if err != nil {
		return 0, "", err
	}

	// Sniff content type from first 512 bytes
	f, err := os.Open(path)
	if err != nil {
		return fi.Size(), "application/octet-stream", nil
	}
	defer f.Close()

	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	contentType := http.DetectContentType(buf[:n])

	return fi.Size(), contentType, nil
}

// S3Storage provides AWS S3 / Cloudflare R2 / Backblaze B2 integration
type S3Storage struct {
	endpoint  string
	region    string
	bucket    string
	accessKey string
	secretKey string
	publicURL string
	client    *http.Client
}

func NewS3Storage(cfg *config.Config) (*S3Storage, error) {
	endpoint := strings.TrimRight(cfg.StorageS3Endpoint, "/")
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://s3.%s.amazonaws.com", cfg.StorageS3Region)
	}

	pubURL := cfg.StoragePublicURL
	if pubURL == "" {
		pubURL = fmt.Sprintf("%s/%s", endpoint, cfg.StorageS3Bucket)
	}

	return &S3Storage{
		endpoint:  endpoint,
		region:    cfg.StorageS3Region,
		bucket:    cfg.StorageS3Bucket,
		accessKey: cfg.StorageS3Key,
		secretKey: cfg.StorageS3Secret,
		publicURL: strings.TrimRight(pubURL, "/"),
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

func (s *S3Storage) PublicURL(objectKey string) string {
	if objectKey == "" {
		return ""
	}
	if strings.HasPrefix(objectKey, "http://") || strings.HasPrefix(objectKey, "https://") || strings.HasPrefix(objectKey, "data:") {
		return objectKey
	}
	return fmt.Sprintf("%s/%s", s.publicURL, strings.TrimLeft(objectKey, "/"))
}

// GeneratePresignedUploadURL generates an S3 Presigned URL (AWS SigV4)
func (s *S3Storage) GeneratePresignedUploadURL(ctx context.Context, objectKey, contentType string, expiry time.Duration) (string, error) {
	return s.generatePresignedURL("PUT", objectKey, contentType, expiry)
}

func (s *S3Storage) GeneratePresignedDownloadURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	return s.generatePresignedURL("GET", objectKey, "", expiry)
}

func (s *S3Storage) generatePresignedURL(method, objectKey, contentType string, expiry time.Duration) (string, error) {
	now := time.Now().UTC()
	dateStamp := now.Format("20060102")
	amzDate := now.Format("20060102T150405Z")
	expSec := int64(expiry.Seconds())
	if expSec <= 0 {
		expSec = 900 // 15 mins default
	}

	canonicalURI := fmt.Sprintf("/%s/%s", s.bucket, strings.TrimLeft(objectKey, "/"))
	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, s.region)

	q := url.Values{}
	q.Set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
	q.Set("X-Amz-Credential", fmt.Sprintf("%s/%s", s.accessKey, credentialScope))
	q.Set("X-Amz-Date", amzDate)
	q.Set("X-Amz-Expires", fmt.Sprintf("%d", expSec))
	q.Set("X-Amz-SignedHeaders", "host")

	canonicalQueryString := q.Encode()

	u, err := url.Parse(s.endpoint)
	if err != nil {
		return "", err
	}
	host := u.Host

	canonicalHeaders := fmt.Sprintf("host:%s\n", host)
	signedHeaders := "host"
	payloadHash := "UNSIGNED-PAYLOAD"

	canonicalRequest := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		method,
		canonicalURI,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	)

	hReq := sha256.Sum256([]byte(canonicalRequest))
	stringToSign := fmt.Sprintf("AWS4-HMAC-SHA256\n%s\n%s\n%s",
		amzDate,
		credentialScope,
		hex.EncodeToString(hReq[:]),
	)

	signingKey := getSignatureKey(s.secretKey, dateStamp, s.region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, []byte(stringToSign)))

	return fmt.Sprintf("%s%s?%s&X-Amz-Signature=%s", s.endpoint, canonicalURI, canonicalQueryString, signature), nil
}

func (s *S3Storage) PutObject(ctx context.Context, objectKey string, data []byte, contentType string) error {
	rawURL := fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucket, strings.TrimLeft(objectKey, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, rawURL, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", contentType)

	// Note: In production direct S3 communication uses SigV4 headers or client SDK
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("s3 PutObject returned status %d", resp.StatusCode)
	}
	return nil
}

func (s *S3Storage) GetObject(ctx context.Context, objectKey string) ([]byte, error) {
	rawURL := fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucket, strings.TrimLeft(objectKey, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrObjectNotFound
	}
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("s3 GetObject returned status %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

func (s *S3Storage) DeleteObject(ctx context.Context, objectKey string) error {
	rawURL := fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucket, strings.TrimLeft(objectKey, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, rawURL, nil)
	if err != nil {
		return err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}

func (s *S3Storage) HeadObject(ctx context.Context, objectKey string) (int64, string, error) {
	rawURL := fmt.Sprintf("%s/%s/%s", s.endpoint, s.bucket, strings.TrimLeft(objectKey, "/"))
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, rawURL, nil)
	if err != nil {
		return 0, "", err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return 0, "", ErrObjectNotFound
	}
	if resp.StatusCode >= 300 {
		return 0, "", fmt.Errorf("s3 HeadObject returned status %d", resp.StatusCode)
	}

	return resp.ContentLength, resp.Header.Get("Content-Type"), nil
}

func hmacSHA256(key, data []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(data)
	return h.Sum(nil)
}

func getSignatureKey(key, dateStamp, regionName, serviceName string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+key), []byte(dateStamp))
	kRegion := hmacSHA256(kDate, []byte(regionName))
	kService := hmacSHA256(kRegion, []byte(serviceName))
	kSigning := hmacSHA256(kService, []byte("aws4_request"))
	return kSigning
}
