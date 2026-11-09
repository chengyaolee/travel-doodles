package geo

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"travel-doodles/internal/cache"
	"travel-doodles/internal/platform/storage"
)

type Service struct {
	pool    *pgxpool.Pool
	cache   cache.CacheService
	storage storage.StorageService
}

func NewService(pool *pgxpool.Pool, cache cache.CacheService, storage storage.StorageService) *Service {
	return &Service{
		pool:    pool,
		cache:   cache,
		storage: storage,
	}
}

// GetMapPosts returns clustered or individual posts for a map viewport with tile-level caching
func (s *Service) GetMapPosts(ctx context.Context, bbox BoundingBox, zoom int, viewerID string, limit int) (*MapResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	// For unauthenticated/public queries, attempt normalized tile cache
	// Calculate primary intersecting tile key if viewport fits inside a single or few tiles
	isPublicOnly := (viewerID == "")
	var tileKey string
	if isPublicOnly && s.cache != nil {
		tiles := BBoxToTiles(bbox, zoom, 4)
		if len(tiles) == 1 {
			tileKey = cache.GeoTileKey(tiles[0].Zoom, tiles[0].X, tiles[0].Y, "public")
			if cached, ok := s.cache.Get(ctx, tileKey); ok {
				var resp MapResponse
				if err := json.Unmarshal(cached, &resp); err == nil {
					return &resp, nil
				}
			}
		}
	}

	// Split bounding box if crossing anti-meridian
	boxes := bbox.SplitAntiMeridian()

	var allPosts []PostMarker
	for _, b := range boxes {
		markers, err := s.queryBoxMarkers(ctx, b, viewerID, limit)
		if err != nil {
			return nil, err
		}
		allPosts = append(allPosts, markers...)
	}

	// Perform zoom-dependent clustering
	res := ClusterPostsInMemory(allPosts, zoom)

	// If single tile and public, cache for 3 minutes with jitter
	if tileKey != "" && isPublicOnly && s.cache != nil {
		if data, err := json.Marshal(res); err == nil {
			_ = s.cache.Set(ctx, tileKey, data, 3*time.Minute)
		}
	}

	return &res, nil
}

func (s *Service) queryBoxMarkers(ctx context.Context, bbox BoundingBox, viewerID string, limit int) ([]PostMarker, error) {
	if s.pool == nil {
		return []PostMarker{}, nil
	}
	// Build PostGIS spatial query using ST_Intersects and ST_MakeEnvelope
	// Enforces privacy: public posts always, plus friends-only if viewer follows author
	query := `
		SELECT 
			p.id, p.author_id, p.caption, p.latitude, p.longitude, p.location_name,
			p.country_code, p.visited_at, p.created_at,
			u.username, u.display_name, u.avatar_key,
			(SELECT pm.thumbnail_key FROM post_media pm WHERE pm.post_id = p.id ORDER BY pm.sort_order ASC LIMIT 1) as thumbnail_key
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.deleted_at IS NULL
		  AND ST_Intersects(p.location, ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography)
		  AND (
			  p.visibility = 'public'
			  OR (p.visibility = 'friends' AND $5 != '' AND (p.author_id = $5::uuid OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $5::uuid AND f.following_id = p.author_id)))
			  OR (p.visibility = 'private' AND $5 != '' AND p.author_id = $5::uuid)
		  )
		  AND NOT EXISTS (
			  SELECT 1 FROM blocks b 
			  WHERE (b.blocker_id = p.author_id AND b.blocked_id = NULLIF($5, '')::uuid)
			     OR (b.blocker_id = NULLIF($5, '')::uuid AND b.blocked_id = p.author_id)
		  )
		ORDER BY p.created_at DESC
		LIMIT $6;
	`

	rows, err := s.pool.Query(ctx, query, bbox.MinLon, bbox.MinLat, bbox.MaxLon, bbox.MaxLat, viewerID, limit)
	if err != nil {
		return nil, fmt.Errorf("spatial query failed: %w", err)
	}
	defer rows.Close()

	var markers []PostMarker
	for rows.Next() {
		var m PostMarker
		var avatarKey, thumbKey *string
		err := rows.Scan(
			&m.ID,
			&m.AuthorID,
			&m.Caption,
			&m.Latitude,
			&m.Longitude,
			&m.LocationName,
			&m.CountryCode,
			&m.VisitedAt,
			&m.CreatedAt,
			&m.AuthorUsername,
			&m.AuthorDisplayName,
			&avatarKey,
			&thumbKey,
		)
		if err != nil {
			return nil, err
		}

		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			m.AuthorAvatarURL = s.storage.PublicURL(*avatarKey)
		}
		if thumbKey != nil && *thumbKey != "" && s.storage != nil {
			m.ThumbnailURL = s.storage.PublicURL(*thumbKey)
		}

		markers = append(markers, m)
	}

	return markers, nil
}

// GetNearbyPosts queries posts within a given radius (km) using PostGIS ST_DWithin
func (s *Service) GetNearbyPosts(ctx context.Context, lon, lat float64, radiusKm float64, viewerID string, limit int) ([]PostMarker, error) {
	if s.pool == nil {
		return []PostMarker{}, nil
	}
	if radiusKm <= 0 {
		radiusKm = 25.0
	}
	if radiusKm > 100.0 {
		radiusKm = 100.0
	}
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	radiusMeters := radiusKm * 1000.0

	query := `
		SELECT 
			p.id, p.author_id, p.caption, p.latitude, p.longitude, p.location_name,
			p.country_code, p.visited_at, p.created_at,
			u.username, u.display_name, u.avatar_key,
			(SELECT pm.thumbnail_key FROM post_media pm WHERE pm.post_id = p.id ORDER BY pm.sort_order ASC LIMIT 1) as thumbnail_key
		FROM posts p
		JOIN users u ON p.author_id = u.id
		WHERE p.deleted_at IS NULL
		  AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
		  AND (
			  p.visibility = 'public'
			  OR (p.visibility = 'friends' AND $4 != '' AND (p.author_id = $4::uuid OR EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $4::uuid AND f.following_id = p.author_id)))
			  OR (p.visibility = 'private' AND $4 != '' AND p.author_id = $4::uuid)
		  )
		ORDER BY ST_Distance(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) ASC
		LIMIT $5;
	`

	rows, err := s.pool.Query(ctx, query, lon, lat, radiusMeters, viewerID, limit)
	if err != nil {
		slog.Error("nearby query failed", "error", err)
		return nil, err
	}
	defer rows.Close()

	var markers []PostMarker
	for rows.Next() {
		var m PostMarker
		var avatarKey, thumbKey *string
		err := rows.Scan(
			&m.ID,
			&m.AuthorID,
			&m.Caption,
			&m.Latitude,
			&m.Longitude,
			&m.LocationName,
			&m.CountryCode,
			&m.VisitedAt,
			&m.CreatedAt,
			&m.AuthorUsername,
			&m.AuthorDisplayName,
			&avatarKey,
			&thumbKey,
		)
		if err != nil {
			return nil, err
		}

		if avatarKey != nil && *avatarKey != "" && s.storage != nil {
			m.AuthorAvatarURL = s.storage.PublicURL(*avatarKey)
		}
		if thumbKey != nil && *thumbKey != "" && s.storage != nil {
			m.ThumbnailURL = s.storage.PublicURL(*thumbKey)
		}

		markers = append(markers, m)
	}

	return markers, nil
}
