package config

import (
	"bufio"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	// Server
	Port        int
	Env         string
	BaseURL     string
	FrontendURL string

	// Database
	DatabaseURL          string
	DBMaxConns           int32
	DBMinConns           int32
	DBMaxIdleTimeMinutes int

	// Redis
	RedisEnabled   bool
	RedisURL       string
	RedisKeyPrefix string

	// Storage
	StorageType      string // "local" or "s3"
	StorageLocalDir  string
	StorageS3Endpoint string
	StorageS3Region  string
	StorageS3Bucket  string
	StorageS3Key     string
	StorageS3Secret  string
	StoragePublicURL string

	// Auth
	SessionSecret        string
	OAuthInternalSecret  string
	SessionCookieName    string
	SessionDurationHours int
	SessionSecureCookie  bool
	SessionSameSite      string

	// Rate Limiting
	RateLimitEnabled           bool
	RateLimitRequestsPerMinute int
	RateLimitAuthPerMinute     int

	// Worker
	WorkerConcurrency      int
	WorkerImageConcurrency int
	WorkerPollInterval     time.Duration
}

// LoadConfig reads configuration from environment variables with sensible defaults.
// It also checks for and parses a local .env file if present.
func LoadConfig() (*Config, error) {
	// Attempt to load .env from current directory or parent directory
	loadDotEnv()

	cfg := &Config{
		Port:                 getEnvInt("PORT", 8080),
		Env:                  getEnv("ENV", "development"),
		BaseURL:              getEnv("BASE_URL", "http://localhost:8080"),
		FrontendURL:          getEnv("FRONTEND_URL", "http://localhost:3000"),
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://travel_user:travel_password@localhost:5432/travel_doodles?sslmode=disable"),
		DBMaxConns:           int32(getEnvInt("DB_MAX_CONNS", 25)),
		DBMinConns:           int32(getEnvInt("DB_MIN_CONNS", 5)),
		DBMaxIdleTimeMinutes: getEnvInt("DB_MAX_IDLE_TIME_MINUTES", 15),

		RedisEnabled:   getEnvBool("REDIS_ENABLED", true),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379/0"),
		RedisKeyPrefix: getEnv("REDIS_KEY_PREFIX", "travel:"),

		StorageType:       getEnv("STORAGE_TYPE", "local"),
		StorageLocalDir:   getEnv("STORAGE_LOCAL_DIR", "./data/storage"),
		StorageS3Endpoint: getEnv("STORAGE_S3_ENDPOINT", ""),
		StorageS3Region:   getEnv("STORAGE_S3_REGION", "auto"),
		StorageS3Bucket:   getEnv("STORAGE_S3_BUCKET", "travel-doodles-media"),
		StorageS3Key:      getEnv("STORAGE_S3_ACCESS_KEY", ""),
		StorageS3Secret:   getEnv("STORAGE_S3_SECRET_KEY", ""),
		StoragePublicURL:  getEnv("STORAGE_PUBLIC_URL", "http://localhost:8080/media/files"),

		SessionSecret:        getEnv("SESSION_SECRET", "travel-doodles-default-secret-change-in-prod-32-bytes"),
		OAuthInternalSecret:  getEnv("OAUTH_INTERNAL_SECRET", ""),
		SessionCookieName:    getEnv("SESSION_COOKIE_NAME", "travel_session"),
		SessionDurationHours: getEnvInt("SESSION_DURATION_HOURS", 168), // 7 days
		SessionSecureCookie:  getEnvBool("SESSION_SECURE_COOKIE", false),
		SessionSameSite:      getEnv("SESSION_SAME_SITE", "lax"),

		RateLimitEnabled:           getEnvBool("RATELIMIT_ENABLED", true),
		RateLimitRequestsPerMinute: getEnvInt("RATELIMIT_REQUESTS_PER_MINUTE", 120),
		RateLimitAuthPerMinute:     getEnvInt("RATELIMIT_AUTH_PER_MINUTE", 10),

		WorkerConcurrency:      getEnvInt("WORKER_CONCURRENCY", 4),
		WorkerImageConcurrency: getEnvInt("WORKER_IMAGE_CONCURRENCY", 2),
		WorkerPollInterval:     time.Duration(getEnvInt("WORKER_POLL_INTERVAL_MS", 1000)) * time.Millisecond,
	}

	if cfg.Env == "production" {
		if cfg.SessionSecret == "travel-doodles-default-secret-change-in-prod-32-bytes" || len(cfg.SessionSecret) < 32 {
			return nil, fmt.Errorf("production environment requires SESSION_SECRET to be at least 32 characters long")
		}
		if cfg.StorageType == "s3" && (cfg.StorageS3Bucket == "" || cfg.StorageS3Key == "") {
			return nil, fmt.Errorf("production S3 storage requires STORAGE_S3_BUCKET and STORAGE_S3_ACCESS_KEY")
		}
	}

	return cfg, nil
}

// RedactedDatabaseURL returns the Database URL with credentials masked for logging
func (c *Config) RedactedDatabaseURL() string {
	u, err := url.Parse(c.DatabaseURL)
	if err != nil {
		return "[malformed database url]"
	}
	return u.Redacted()
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && strings.TrimSpace(val) != "" {
		return strings.TrimSpace(val)
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val, ok := os.LookupEnv(key); ok {
		if i, err := strconv.Atoi(strings.TrimSpace(val)); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val, ok := os.LookupEnv(key); ok {
		if b, err := strconv.ParseBool(strings.TrimSpace(val)); err == nil {
			return b
		}
	}
	return defaultVal
}

// loadDotEnv searches for and loads key=value pairs from a .env file
func loadDotEnv() {
	candidates := []string{".env", "../.env", "../../.env"}
	if custom := os.Getenv("ENV_FILE"); custom != "" {
		candidates = append([]string{custom}, candidates...)
	}

	for _, path := range candidates {
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		defer f.Close()

		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}

			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])

			// Strip matching quotes if wrapped
			if len(val) >= 2 {
				if (val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'') {
					val = val[1 : len(val)-1]
				}
			}

			// Don't overwrite existing environment variables
			if _, exists := os.LookupEnv(key); !exists {
				_ = os.Setenv(key, val)
			}
		}
		return // Loaded the first found .env
	}
}
