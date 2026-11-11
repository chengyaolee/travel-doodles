package auth

import (
	"testing"
)

func TestArgon2_HashAndVerify(t *testing.T) {
	password := "SecretTravelPass123!"

	// Use fast test params to speed up unit test execution
	testParams := &Argon2Params{
		Memory:      8 * 1024, // 8 MB for tests
		Iterations:  1,
		Parallelism: 1,
		SaltLength:  16,
		KeyLength:   32,
	}

	hash, err := HashPassword(password, testParams)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}

	if hash == "" {
		t.Fatalf("expected non-empty hash")
	}

	// Correct password
	valid, err := VerifyPassword(password, hash)
	if err != nil {
		t.Fatalf("VerifyPassword failed: %v", err)
	}
	if !valid {
		t.Errorf("expected password to match hash")
	}

	// Wrong password
	valid, err = VerifyPassword("WrongPassword!", hash)
	if err != nil {
		t.Fatalf("VerifyPassword error: %v", err)
	}
	if valid {
		t.Errorf("expected wrong password to fail verification")
	}
}

func TestGenerateToken(t *testing.T) {
	tok1, err := GenerateToken()
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}
	tok2, _ := GenerateToken()

	if len(tok1) != 64 { // 32 bytes hex encoded = 64 hex chars
		t.Errorf("expected 64 char hex string, got %d", len(tok1))
	}
	if tok1 == tok2 {
		t.Errorf("expected random tokens to be unique")
	}

	h1 := HashToken(tok1)
	if len(h1) != 64 {
		t.Errorf("expected 64 char SHA-256 hex string, got %d", len(h1))
	}
}

func TestGenerateRandomCustomID(t *testing.T) {
	id1 := GenerateRandomCustomID("wanderer")
	id2 := GenerateRandomCustomID("wanderer")

	if id1 == id2 {
		t.Errorf("expected random custom IDs to be unique")
	}
	if len(id1) < 10 {
		t.Errorf("unexpected custom ID length: %s", id1)
	}

	idDefault := GenerateRandomCustomID("")
	if len(idDefault) < 10 {
		t.Errorf("unexpected default custom ID: %s", idDefault)
	}
}

func TestGenerateChallenge(t *testing.T) {
	ch1, err := GenerateChallenge()
	if err != nil {
		t.Fatalf("failed to generate challenge: %v", err)
	}
	ch2, _ := GenerateChallenge()

	if ch1 == ch2 {
		t.Errorf("expected unique challenges")
	}
	if len(ch1) == 0 {
		t.Errorf("expected non-empty challenge")
	}
}
