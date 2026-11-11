package cache

import "fmt"

// GeoTileKey returns a normalized tile cache key: geo:v1:z{z}:x{x}:y{y}:{scope}
func GeoTileKey(z, x, y int, scope string) string {
	if scope == "" {
		scope = "public"
	}
	return fmt.Sprintf("geo:v1:z%d:x%d:y%d:%s", z, x, y, scope)
}

// GeoTilePrefix returns a prefix for invalidating all tiles at or within a scope
func GeoTilePrefix() string {
	return "geo:v1:"
}

// FeedFirstPageKey returns the cache key for the first page of a user's feed
func FeedFirstPageKey(userID string) string {
	return fmt.Sprintf("feed:v1:user:%s:first", userID)
}

// PostDetailKey returns the cache key for a post detail object
func PostDetailKey(postID string) string {
	return fmt.Sprintf("post:v1:%s", postID)
}

// ProfileKey returns the cache key for a public user profile
func ProfileKey(username string) string {
	return fmt.Sprintf("profile:v1:%s:public", username)
}

// RateLimitKey returns the cache key for tracking rate limits
func RateLimitKey(identity, action string) string {
	return fmt.Sprintf("ratelimit:v1:%s:%s", identity, action)
}
