package cache

import (
	"container/list"
	"context"
	"fmt"
	"log/slog"
	"math/rand"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"travel-doodles/internal/platform/config"
	"travel-doodles/internal/platform/observability"
)

const (
	MaxCachedValueBytes = 1024 * 1024 // 1 MB per cached entry
	DefaultLRUCapacity  = 5000
)

type CacheService interface {
	Get(ctx context.Context, key string) ([]byte, bool)
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	DeletePrefix(ctx context.Context, prefix string) error
	Close() error
}

// In-Memory Item
type lruItem struct {
	key       string
	val       []byte
	expiresAt time.Time
}

// MemoryCache is a thread-safe in-process LRU cache with TTL
type MemoryCache struct {
	mu       sync.Mutex
	capacity int
	items    map[string]*list.Element
	evict    *list.List
}

func NewMemoryCache(capacity int) *MemoryCache {
	if capacity <= 0 {
		capacity = DefaultLRUCapacity
	}
	mc := &MemoryCache{
		capacity: capacity,
		items:    make(map[string]*list.Element),
		evict:    list.New(),
	}
	return mc
}

func (m *MemoryCache) Get(ctx context.Context, key string) ([]byte, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	elem, exists := m.items[key]
	if !exists {
		return nil, false
	}

	item := elem.Value.(*lruItem)
	if !item.expiresAt.IsZero() && time.Now().After(item.expiresAt) {
		m.evictElement(elem)
		return nil, false
	}

	m.evict.MoveToFront(elem)
	// Return a copy to avoid external mutation
	dst := make([]byte, len(item.val))
	copy(dst, item.val)
	return dst, true
}

func (m *MemoryCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if len(value) > MaxCachedValueBytes {
		return fmt.Errorf("value exceeds maximum cache entry size of %d bytes", MaxCachedValueBytes)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	var expiresAt time.Time
	if ttl > 0 {
		jitter := time.Duration(rand.Int63n(int64(ttl / 5))) // Up to 20% jitter
		expiresAt = time.Now().Add(ttl + jitter)
	}

	// Update existing
	if elem, exists := m.items[key]; exists {
		m.evict.MoveToFront(elem)
		item := elem.Value.(*lruItem)
		item.val = make([]byte, len(value))
		copy(item.val, value)
		item.expiresAt = expiresAt
		return nil
	}

	// Evict oldest if full
	if m.evict.Len() >= m.capacity {
		oldest := m.evict.Back()
		if oldest != nil {
			m.evictElement(oldest)
		}
	}

	valCopy := make([]byte, len(value))
	copy(valCopy, value)

	item := &lruItem{key: key, val: valCopy, expiresAt: expiresAt}
	elem := m.evict.PushFront(item)
	m.items[key] = elem
	return nil
}

func (m *MemoryCache) Delete(ctx context.Context, key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if elem, exists := m.items[key]; exists {
		m.evictElement(elem)
	}
	return nil
}

func (m *MemoryCache) DeletePrefix(ctx context.Context, prefix string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var toRemove []*list.Element
	for k, elem := range m.items {
		if len(k) >= len(prefix) && k[:len(prefix)] == prefix {
			toRemove = append(toRemove, elem)
		}
	}
	for _, elem := range toRemove {
		m.evictElement(elem)
	}
	return nil
}

func (m *MemoryCache) evictElement(elem *list.Element) {
	m.evict.Remove(elem)
	item := elem.Value.(*lruItem)
	delete(m.items, item.key)
}

func (m *MemoryCache) Close() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items = make(map[string]*list.Element)
	m.evict.Init()
	return nil
}

// ResilientCache wraps Redis with automatic seamless fallback to MemoryCache if Redis is down
type ResilientCache struct {
	redisClient *redis.Client
	localCache  *MemoryCache
	prefix      string
	metrics     *observability.Metrics
}

func NewCache(cfg *config.Config, metrics *observability.Metrics) CacheService {
	local := NewMemoryCache(DefaultLRUCapacity)

	if !cfg.RedisEnabled || cfg.RedisURL == "" {
		slog.Info("redis disabled by config; running in pure in-memory cache mode")
		return local
	}

	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		slog.Warn("invalid redis url, falling back to in-memory cache", "error", err)
		return local
	}

	// Conservative network timeouts for low-cost VPS
	opts.DialTimeout = 2 * time.Second
	opts.ReadTimeout = 1 * time.Second
	opts.WriteTimeout = 1 * time.Second
	opts.PoolSize = 10

	rdb := redis.NewClient(opts)

	// Quick ping check
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Warn("redis ping failed at startup, enabling resilient fallback mode", "error", err)
	} else {
		slog.Info("connected to redis cache successfully", "url", cfg.RedisURL)
	}

	return &ResilientCache{
		redisClient: rdb,
		localCache:  local,
		prefix:      cfg.RedisKeyPrefix,
		metrics:     metrics,
	}
}

func (c *ResilientCache) fullKey(key string) string {
	return c.prefix + key
}

func (c *ResilientCache) Get(ctx context.Context, key string) ([]byte, bool) {
	// Try Redis first
	fKey := c.fullKey(key)
	val, err := c.redisClient.Get(ctx, fKey).Bytes()
	if err == nil {
		if c.metrics != nil {
			c.metrics.RecordCacheHit()
		}
		return val, true
	}

	// If key simply does not exist, check local or return miss
	if err == redis.Nil {
		// Also check local cache
		if lVal, ok := c.localCache.Get(ctx, key); ok {
			if c.metrics != nil {
				c.metrics.RecordCacheHit()
			}
			return lVal, true
		}
		if c.metrics != nil {
			c.metrics.RecordCacheMiss()
		}
		return nil, false
	}

	// Redis connection error -> graceful degradation to local cache
	slog.Debug("redis read error, falling back to in-memory cache", "key", key, "error", err)
	if lVal, ok := c.localCache.Get(ctx, key); ok {
		if c.metrics != nil {
			c.metrics.RecordCacheHit()
		}
		return lVal, true
	}

	if c.metrics != nil {
		c.metrics.RecordCacheMiss()
	}
	return nil, false
}

func (c *ResilientCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if len(value) > MaxCachedValueBytes {
		return fmt.Errorf("value exceeds maximum cache entry size of %d bytes", MaxCachedValueBytes)
	}

	// Add 10-20% random jitter to TTL to mitigate thundering herds
	jitteredTTL := ttl
	if ttl > 0 {
		jitter := time.Duration(rand.Int63n(int64(ttl / 5)))
		jitteredTTL = ttl + jitter
	}

	// Write to local cache first
	_ = c.localCache.Set(ctx, key, value, jitteredTTL)

	// Write to Redis
	fKey := c.fullKey(key)
	err := c.redisClient.Set(ctx, fKey, value, jitteredTTL).Err()
	if err != nil {
		slog.Debug("redis write error, cached locally only", "key", key, "error", err)
	}
	return nil
}

func (c *ResilientCache) Delete(ctx context.Context, key string) error {
	_ = c.localCache.Delete(ctx, key)
	fKey := c.fullKey(key)
	return c.redisClient.Del(ctx, fKey).Err()
}

func (c *ResilientCache) DeletePrefix(ctx context.Context, prefix string) error {
	_ = c.localCache.DeletePrefix(ctx, prefix)

	fPrefix := c.fullKey(prefix) + "*"
	iter := c.redisClient.Scan(ctx, 0, fPrefix, 100).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
		if len(keys) >= 100 {
			_ = c.redisClient.Del(ctx, keys...).Err()
			keys = keys[:0]
		}
	}
	if len(keys) > 0 {
		_ = c.redisClient.Del(ctx, keys...).Err()
	}
	return iter.Err()
}

func (c *ResilientCache) Close() error {
	_ = c.localCache.Close()
	return c.redisClient.Close()
}
