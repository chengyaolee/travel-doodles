package config

import (
	"os"
	"testing"
)

func TestLoadConfig_Defaults(t *testing.T) {
	os.Clearenv()
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("unexpected error loading default config: %v", err)
	}

	if cfg.Port != 8080 {
		t.Errorf("expected default Port 8080, got %d", cfg.Port)
	}
	if cfg.DBMaxConns != 25 {
		t.Errorf("expected DBMaxConns 25, got %d", cfg.DBMaxConns)
	}
	if cfg.StorageType != "local" {
		t.Errorf("expected default storage local, got %s", cfg.StorageType)
	}
}

func TestLoadConfig_EnvOverrides(t *testing.T) {
	os.Setenv("PORT", "9000")
	os.Setenv("ENV", "staging")
	os.Setenv("DB_MAX_CONNS", "15")
	defer os.Clearenv()

	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != 9000 {
		t.Errorf("expected Port 9000, got %d", cfg.Port)
	}
	if cfg.Env != "staging" {
		t.Errorf("expected Env staging, got %s", cfg.Env)
	}
	if cfg.DBMaxConns != 15 {
		t.Errorf("expected DBMaxConns 15, got %d", cfg.DBMaxConns)
	}
}

func TestRedactedDatabaseURL(t *testing.T) {
	cfg := &Config{
		DatabaseURL: "postgres://myuser:secretpassword@localhost:5432/travel_doodles",
	}
	redacted := cfg.RedactedDatabaseURL()
	if redacted == "" || redacted == cfg.DatabaseURL {
		t.Errorf("expected password to be masked, got: %s", redacted)
	}
}
