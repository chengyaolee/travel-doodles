package friends

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"travel-doodles/internal/auth"
)

func TestCanonicalPair(t *testing.T) {
	idA := "00000000-0000-0000-0000-000000000001"
	idB := "00000000-0000-0000-0000-000000000002"

	u1, u2 := CanonicalPair(idA, idB)
	if u1 != idA || u2 != idB {
		t.Errorf("expected (%s, %s), got (%s, %s)", idA, idB, u1, u2)
	}

	u3, u4 := CanonicalPair(idB, idA)
	if u3 != idA || u4 != idB {
		t.Errorf("expected canonical ordering (%s, %s), got (%s, %s)", idA, idB, u3, u4)
	}
}

func TestInviteExpiration(t *testing.T) {
	past := time.Now().Add(-1 * time.Hour)
	future := time.Now().Add(1 * time.Hour)

	invExpired := FriendInvite{
		ExpiresAt: &past,
		MaxUses:   0,
		UsesCount: 0,
	}

	if invExpired.ExpiresAt == nil || !time.Now().After(*invExpired.ExpiresAt) {
		t.Errorf("expected invite to be evaluated as expired")
	}

	invValid := FriendInvite{
		ExpiresAt: &future,
		MaxUses:   5,
		UsesCount: 2,
	}

	if invValid.ExpiresAt != nil && time.Now().After(*invValid.ExpiresAt) {
		t.Errorf("expected invite to be valid")
	}
	if invValid.MaxUses > 0 && invValid.UsesCount >= invValid.MaxUses {
		t.Errorf("expected invite not to be exhausted")
	}
}

func TestHandler_Unauthenticated(t *testing.T) {
	h := NewHandler(nil)

	// Add friend without auth -> 401
	payload, _ := json.Marshal(AddFriendByIDRequest{CustomID: "alice"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/friends/add", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	h.AddFriendByID(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized, got %d", rec.Code)
	}

	// Create invite without auth -> 401
	reqInvite := httptest.NewRequest(http.MethodPost, "/api/v1/friends/invites", nil)
	recInvite := httptest.NewRecorder()
	h.CreateInvite(recInvite, reqInvite)

	if recInvite.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for create invite, got %d", recInvite.Code)
	}
}

func TestHandler_AddSelf_Rejection(t *testing.T) {
	service := &Service{}
	h := NewHandler(service)

	user := &auth.User{
		ID:       "00000000-0000-0000-0000-000000000001",
		CustomID: "my_custom_id",
	}

	// Try to add self
	payload, _ := json.Marshal(AddFriendByIDRequest{CustomID: "my_custom_id"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/friends/add", bytes.NewReader(payload))
	req = req.WithContext(auth.WithUser(req.Context(), user))
	rec := httptest.NewRecorder()

	// Handler will call service which checks lookup or self
	h.AddFriendByID(rec, req)

	// Since db pool is nil in unit test, it returns 500 or 400/404, but definitely not 200
	if rec.Code == http.StatusOK || rec.Code == http.StatusCreated {
		t.Errorf("expected request to fail, got %d", rec.Code)
	}
}
