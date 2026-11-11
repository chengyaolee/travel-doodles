package geo

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// BoundingBox represents a geographic bounding box in WGS 84 (EPSG:4326) coordinates
type BoundingBox struct {
	MinLon float64 `json:"min_lon"`
	MinLat float64 `json:"min_lat"`
	MaxLon float64 `json:"max_lon"`
	MaxLat float64 `json:"max_lat"`
}

// TileCoord represents a Web Mercator tile index at a specific zoom level
type TileCoord struct {
	Zoom int `json:"zoom"`
	X    int `json:"x"`
	Y    int `json:"y"`
}

// ParseBBox parses a comma-separated string "minLon,minLat,maxLon,maxLat"
func ParseBBox(s string) (BoundingBox, error) {
	parts := strings.Split(s, ",")
	if len(parts) != 4 {
		return BoundingBox{}, fmt.Errorf("invalid bbox format, expected 'minLon,minLat,maxLon,maxLat'")
	}

	minLon, err := strconv.ParseFloat(strings.TrimSpace(parts[0]), 64)
	if err != nil {
		return BoundingBox{}, fmt.Errorf("invalid minLon: %w", err)
	}
	minLat, err := strconv.ParseFloat(strings.TrimSpace(parts[1]), 64)
	if err != nil {
		return BoundingBox{}, fmt.Errorf("invalid minLat: %w", err)
	}
	maxLon, err := strconv.ParseFloat(strings.TrimSpace(parts[2]), 64)
	if err != nil {
		return BoundingBox{}, fmt.Errorf("invalid maxLon: %w", err)
	}
	maxLat, err := strconv.ParseFloat(strings.TrimSpace(parts[3]), 64)
	if err != nil {
		return BoundingBox{}, fmt.Errorf("invalid maxLat: %w", err)
	}

	// Clamp latitudes to valid geographic bounds [-90, 90]
	minLat = clamp(minLat, -90.0, 90.0)
	maxLat = clamp(maxLat, -90.0, 90.0)
	if minLat > maxLat {
		minLat, maxLat = maxLat, minLat
	}

	// Normalize longitudes to [-180, 180]
	minLon = normalizeLon(minLon)
	maxLon = normalizeLon(maxLon)

	return BoundingBox{
		MinLon: minLon,
		MinLat: minLat,
		MaxLon: maxLon,
		MaxLat: maxLat,
	}, nil
}

// CrossesAntiMeridian returns true if the bounding box spans across the International Date Line (180° meridian)
func (b BoundingBox) CrossesAntiMeridian() bool {
	return b.MinLon > b.MaxLon
}

// SplitAntiMeridian splits a bounding box that crosses the Date Line into two standard boxes
func (b BoundingBox) SplitAntiMeridian() []BoundingBox {
	if !b.CrossesAntiMeridian() {
		return []BoundingBox{b}
	}

	// Box 1: from MinLon to +180°
	// Box 2: from -180° to MaxLon
	return []BoundingBox{
		{
			MinLon: b.MinLon,
			MinLat: b.MinLat,
			MaxLon: 180.0,
			MaxLat: b.MaxLat,
		},
		{
			MinLon: -180.0,
			MinLat: b.MinLat,
			MaxLon: b.MaxLon,
			MaxLat: b.MaxLat,
		},
	}
}

// LonLatToTile converts longitude and latitude to Web Mercator tile (X, Y) at a given zoom level
func LonLatToTile(lon, lat float64, zoom int) TileCoord {
	lat = clamp(lat, -85.05112878, 85.05112878)
	lon = normalizeLon(lon)

	n := math.Pow(2.0, float64(zoom))
	x := int(math.Floor((lon + 180.0) / 360.0 * n))

	latRad := lat * math.Pi / 180.0
	y := int(math.Floor((1.0 - math.Log(math.Tan(latRad)+1.0/math.Cos(latRad))/math.Pi) / 2.0 * n))

	maxTile := int(n) - 1
	if x < 0 {
		x = 0
	}
	if x > maxTile {
		x = maxTile
	}
	if y < 0 {
		y = 0
	}
	if y > maxTile {
		y = maxTile
	}

	return TileCoord{Zoom: zoom, X: x, Y: y}
}

// TileToBBox converts a Web Mercator tile index (X, Y, Zoom) to its geographic bounding box
func TileToBBox(tile TileCoord) BoundingBox {
	n := math.Pow(2.0, float64(tile.Zoom))

	minLon := float64(tile.X)/n*360.0 - 180.0
	maxLon := float64(tile.X+1)/n*360.0 - 180.0

	maxLat := tileYToLat(float64(tile.Y), n)
	minLat := tileYToLat(float64(tile.Y+1), n)

	return BoundingBox{
		MinLon: minLon,
		MinLat: minLat,
		MaxLon: maxLon,
		MaxLat: maxLat,
	}
}

func tileYToLat(y, n float64) float64 {
	sinh := math.Sinh(math.Pi * (1.0 - 2.0*y/n))
	return math.Atan(sinh) * 180.0 / math.Pi
}

// BBoxToTiles returns the set of Web Mercator tiles intersecting a bounding box, capped at maxTiles
func BBoxToTiles(bbox BoundingBox, zoom int, maxTiles int) []TileCoord {
	if maxTiles <= 0 {
		maxTiles = 36
	}

	boxes := bbox.SplitAntiMeridian()
	var tiles []TileCoord
	seen := make(map[string]bool)

	for _, b := range boxes {
		nw := LonLatToTile(b.MinLon, b.MaxLat, zoom)
		se := LonLatToTile(b.MaxLon, b.MinLat, zoom)

		minX, maxX := nw.X, se.X
		minY, maxY := nw.Y, se.Y
		if minY > maxY {
			minY, maxY = maxY, minY
		}

		for x := minX; x <= maxX; x++ {
			for y := minY; y <= maxY; y++ {
				key := fmt.Sprintf("%d:%d", x, y)
				if !seen[key] {
					seen[key] = true
					tiles = append(tiles, TileCoord{Zoom: zoom, X: x, Y: y})
					if len(tiles) >= maxTiles {
						return tiles
					}
				}
			}
		}
	}

	return tiles
}

// AdjacentTiles returns the immediate 8-neighbor tiles around a given tile for prefetching
func AdjacentTiles(t TileCoord) []TileCoord {
	n := int(math.Pow(2.0, float64(t.Zoom)))
	var neighbors []TileCoord

	for dx := -1; dx <= 1; dx++ {
		for dy := -1; dy <= 1; dy++ {
			if dx == 0 && dy == 0 {
				continue
			}
			nx := (t.X + dx + n) % n // Wrap horizontally
			ny := t.Y + dy
			if ny >= 0 && ny < n {
				neighbors = append(neighbors, TileCoord{Zoom: t.Zoom, X: nx, Y: ny})
			}
		}
	}
	return neighbors
}

func clamp(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func normalizeLon(lon float64) float64 {
	for lon < -180.0 {
		lon += 360.0
	}
	for lon > 180.0 {
		lon -= 360.0
	}
	return lon
}
