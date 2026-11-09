package geo

import (
	"fmt"
	"time"
)

// MapResponse represents the zoom-dependent discovery payload returned to the frontend
type MapResponse struct {
	Zoom      int          `json:"zoom"`
	Clusters  []Cluster    `json:"clusters"`
	Markers   []PostMarker `json:"markers"`
	TileCount int          `json:"tile_count,omitempty"`
}

// Cluster represents aggregated posts within a geographic area
type Cluster struct {
	ID                      string      `json:"id"`
	Latitude                float64     `json:"latitude"`
	Longitude               float64     `json:"longitude"`
	Count                   int         `json:"count"`
	RepresentativePostID    string      `json:"representative_post_id"`
	RepresentativeThumbnail string      `json:"representative_thumbnail,omitempty"`
	Bounds                  BoundingBox `json:"bounds"`
}

// PostMarker represents a single post displayed as an individual pin on the map
type PostMarker struct {
	ID                string     `json:"id"`
	AuthorID          string     `json:"author_id"`
	AuthorUsername    string     `json:"author_username"`
	AuthorDisplayName string     `json:"author_display_name"`
	AuthorAvatarURL   string     `json:"author_avatar_url,omitempty"`
	Caption           string     `json:"caption"`
	Latitude          float64    `json:"latitude"`
	Longitude         float64    `json:"longitude"`
	LocationName      string     `json:"location_name"`
	CountryCode       string     `json:"country_code"`
	ThumbnailURL      string     `json:"thumbnail_url,omitempty"`
	VisitedAt         *time.Time `json:"visited_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}

// ClusterResolution calculates the grid snap size in degrees based on zoom level
func ClusterResolution(zoom int) float64 {
	switch {
	case zoom <= 2:
		return 10.0 // ~1,000 km
	case zoom <= 4:
		return 4.0 // ~400 km
	case zoom <= 6:
		return 1.0 // ~100 km
	case zoom <= 8:
		return 0.25 // ~25 km
	case zoom <= 11:
		return 0.05 // ~5 km
	default:
		return 0.0 // High zoom: no clustering, return raw markers
	}
}

// ClusterPostsInMemory groups a list of post markers into clusters using grid cell hashing
// Useful for unit tests, fallback, or client-side/in-memory pre-aggregation
func ClusterPostsInMemory(posts []PostMarker, zoom int) MapResponse {
	gridSize := ClusterResolution(zoom)

	if gridSize <= 0.0 || zoom >= 12 {
		// High zoom: return all individual markers
		return MapResponse{
			Zoom:     zoom,
			Clusters: []Cluster{},
			Markers:  posts,
		}
	}

	type cellData struct {
		sumLat   float64
		sumLon   float64
		count    int
		repPost  PostMarker
		minLat   float64
		maxLat   float64
		minLon   float64
		maxLon   float64
		allPosts []PostMarker
	}

	cells := make(map[string]*cellData)

	for _, p := range posts {
		cellX := int(p.Longitude / gridSize)
		cellY := int(p.Latitude / gridSize)
		key := fmt.Sprintf("%d:%d", cellX, cellY)

		cd, exists := cells[key]
		if !exists {
			cd = &cellData{
				minLat:   p.Latitude,
				maxLat:   p.Latitude,
				minLon:   p.Longitude,
				maxLon:   p.Longitude,
				repPost:  p,
				allPosts: []PostMarker{},
			}
			cells[key] = cd
		}

		cd.sumLat += p.Latitude
		cd.sumLon += p.Longitude
		cd.count++
		cd.allPosts = append(cd.allPosts, p)

		if p.Latitude < cd.minLat {
			cd.minLat = p.Latitude
		}
		if p.Latitude > cd.maxLat {
			cd.maxLat = p.Latitude
		}
		if p.Longitude < cd.minLon {
			cd.minLon = p.Longitude
		}
		if p.Longitude > cd.maxLon {
			cd.maxLon = p.Longitude
		}
	}

	var clusters []Cluster
	var markers []PostMarker

	for key, cd := range cells {
		// Medium zoom threshold: if cell only has 1 or 2 posts, show as individual markers
		if zoom >= 7 && cd.count <= 2 {
			markers = append(markers, cd.allPosts...)
			continue
		}

		avgLat := cd.sumLat / float64(cd.count)
		avgLon := cd.sumLon / float64(cd.count)

		clusters = append(clusters, Cluster{
			ID:                      fmt.Sprintf("cl_%d_%s", zoom, key),
			Latitude:                avgLat,
			Longitude:               avgLon,
			Count:                   cd.count,
			RepresentativePostID:    cd.repPost.ID,
			RepresentativeThumbnail: cd.repPost.ThumbnailURL,
			Bounds: BoundingBox{
				MinLat: cd.minLat,
				MaxLat: cd.maxLat,
				MinLon: cd.minLon,
				MaxLon: cd.maxLon,
			},
		})
	}

	return MapResponse{
		Zoom:     zoom,
		Clusters: clusters,
		Markers:  markers,
	}
}
