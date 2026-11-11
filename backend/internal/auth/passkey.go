package auth

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"time"
)

// PasskeyChallenge represents a WebAuthn / Passkey challenge
type PasskeyChallenge struct {
	Challenge string    `json:"challenge"`
	ExpiresAt time.Time `json:"expires_at"`
	UserID    string    `json:"user_id,omitempty"`
	CustomID  string    `json:"custom_id,omitempty"`
}

// GenerateChallenge creates a random base64url challenge string
func GenerateChallenge() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// PasskeyRegisterStartResponse contains parameters needed by navigator.credentials.create()
type PasskeyRegisterStartResponse struct {
	Challenge string `json:"challenge"`
	RP        struct {
		Name string `json:"name"`
		ID   string `json:"id"`
	} `json:"rp"`
	User struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		DisplayName string `json:"displayName"`
	} `json:"user"`
	PubKeyCredParams []struct {
		Type int    `json:"type"`
		Alg  int    `json:"alg"` // -7 for ES256, -257 for RS256
	} `json:"pubKeyCredParams"`
	Timeout uint64 `json:"timeout"`
}

// PasskeyRegisterFinishRequest holds the client response from navigator.credentials.create()
type PasskeyRegisterFinishRequest struct {
	CustomID     string `json:"custom_id"`
	DisplayName  string `json:"display_name"`
	Bio          string `json:"bio"`
	CredentialID string `json:"credential_id"`
	PublicKey    string `json:"public_key"`
	ClientData   string `json:"client_data_json"`
}

// PasskeyLoginStartResponse contains challenge for navigator.credentials.get()
type PasskeyLoginStartResponse struct {
	Challenge string `json:"challenge"`
	Timeout   uint64 `json:"timeout"`
	RPID      string `json:"rpId"`
}

// PasskeyLoginFinishRequest holds response from navigator.credentials.get()
type PasskeyLoginFinishRequest struct {
	CredentialID string `json:"credential_id"`
	Signature    string `json:"signature"`
	ClientData   string `json:"client_data_json"`
}

// GenerateRandomCustomID generates a random default user ID like traveler_8f2a
func GenerateRandomCustomID(base string) string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	suffix := hex.EncodeToString(b)
	if base == "" {
		base = "traveler"
	}
	// Sanitize base: lowercase alphanumeric only
	var clean []rune
	for _, r := range base {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			clean = append(clean, r)
		}
	}
	cleanBase := string(clean)
	if len(cleanBase) == 0 {
		cleanBase = "traveler"
	}
	if len(cleanBase) > 20 {
		cleanBase = cleanBase[:20]
	}
	return cleanBase + "_" + suffix
}
