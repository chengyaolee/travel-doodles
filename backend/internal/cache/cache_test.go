package cache

import (
	"context"
	"testing"
	"time"
)

func TestMemoryCache_BasicOperations(t *testing.T) {
	mc := NewMemoryCache(5)
	ctx := context.Background()

	key := "test_key"
	val := []byte("hello world")

	// Set and Get
	err := mc.Set(ctx, key, val, 1*time.Minute)
	if err != nil {
		t.Fatalf("Set failed: %v", err)
	}

	got, found := mc.Get(ctx, key)
	if !found {
		t.Fatalf("expected key to be found")
	}
	if string(got) != string(val) {
		t.Errorf("expected %s, got %s", val, got)
	}

	// Delete
	err = mc.Delete(ctx, key)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	_, found = mc.Get(ctx, key)
	if found {
		t.Errorf("expected key to be deleted")
	}
}

func TestMemoryCache_CapacityEviction(t *testing.T) {
	capacity := 3
	mc := NewMemoryCache(capacity)
	ctx := context.Background()

	_ = mc.Set(ctx, "k1", []byte("v1"), 1*time.Minute)
	_ = mc.Set(ctx, "k2", []byte("v2"), 1*time.Minute)
	_ = mc.Set(ctx, "k3", []byte("v3"), 1*time.Minute)

	// Access k1 to make it most recently used
	_, _ = mc.Get(ctx, "k1")

	// Insert k4, should evict k2 (oldest)
	_ = mc.Set(ctx, "k4", []byte("v4"), 1*time.Minute)

	if _, found := mc.Get(ctx, "k2"); found {
		t.Errorf("expected k2 to be evicted")
	}
	if _, found := mc.Get(ctx, "k1"); !found {
		t.Errorf("expected k1 to still exist")
	}
	if _, found := mc.Get(ctx, "k4"); !found {
		t.Errorf("expected k4 to exist")
	}
}

func TestMemoryCache_DeletePrefix(t *testing.T) {
	mc := NewMemoryCache(10)
	ctx := context.Background()

	_ = mc.Set(ctx, "geo:v1:z6:x1:y1:public", []byte("tile1"), 1*time.Minute)
	_ = mc.Set(ctx, "geo:v1:z6:x1:y2:public", []byte("tile2"), 1*time.Minute)
	_ = mc.Set(ctx, "post:v1:abc", []byte("post"), 1*time.Minute)

	err := mc.DeletePrefix(ctx, "geo:v1:")
	if err != nil {
		t.Fatalf("DeletePrefix failed: %v", err)
	}

	if _, found := mc.Get(ctx, "geo:v1:z6:x1:y1:public"); found {
		t.Errorf("expected geo key to be deleted")
	}
	if _, found := mc.Get(ctx, "post:v1:abc"); !found {
		t.Errorf("expected post key to remain untouched")
	}
}

func TestKeyGenerators(t *testing.T) {
	tileKey := GeoTileKey(6, 32, 21, "public")
	expected := "geo:v1:z6:x32:y21:public"
	if tileKey != expected {
		t.Errorf("expected %s, got %s", expected, tileKey)
	}

	feedKey := FeedFirstPageKey("user123")
	if feedKey != "feed:v1:user:user123:first" {
		t.Errorf("unexpected feed key: %s", feedKey)
	}
}
