package geo

import (
	"testing"
)

func TestParseBBox_Standard(t *testing.T) {
	raw := "-122.5,37.7,-122.3,37.8"
	bbox, err := ParseBBox(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if bbox.MinLon != -122.5 || bbox.MinLat != 37.7 || bbox.MaxLon != -122.3 || bbox.MaxLat != 37.8 {
		t.Errorf("unexpected parsed bbox: %+v", bbox)
	}
	if bbox.CrossesAntiMeridian() {
		t.Errorf("expected standard bbox not to cross anti-meridian")
	}
}

func TestParseBBox_AntiMeridian(t *testing.T) {
	// Fiji / Pacific crossing 180° meridian: MinLon = 175.0, MaxLon = -175.0
	raw := "175.0,-20.0,-175.0,-15.0"
	bbox, err := ParseBBox(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !bbox.CrossesAntiMeridian() {
		t.Fatalf("expected bbox to cross anti-meridian")
	}

	split := bbox.SplitAntiMeridian()
	if len(split) != 2 {
		t.Fatalf("expected 2 split bounding boxes, got %d", len(split))
	}

	// Box 1: [175, -20, 180, -15]
	if split[0].MinLon != 175.0 || split[0].MaxLon != 180.0 {
		t.Errorf("box 1 invalid: %+v", split[0])
	}
	// Box 2: [-180, -20, -175, -15]
	if split[1].MinLon != -180.0 || split[1].MaxLon != -175.0 {
		t.Errorf("box 2 invalid: %+v", split[1])
	}
}

func TestLonLatToTile_RoundTrip(t *testing.T) {
	lon := 2.3522  // Paris
	lat := 48.8566
	zoom := 10

	tile := LonLatToTile(lon, lat, zoom)
	bbox := TileToBBox(tile)

	if lon < bbox.MinLon || lon > bbox.MaxLon {
		t.Errorf("longitude %f outside tile bounds [%f, %f]", lon, bbox.MinLon, bbox.MaxLon)
	}
	if lat < bbox.MinLat || lat > bbox.MaxLat {
		t.Errorf("latitude %f outside tile bounds [%f, %f]", lat, bbox.MinLat, bbox.MaxLat)
	}
}

func TestBBoxToTiles_Limit(t *testing.T) {
	// Entire world at zoom 6 has 2^6 * 2^6 = 4096 tiles
	world := BoundingBox{MinLon: -180, MinLat: -85, MaxLon: 180, MaxLat: 85}
	tiles := BBoxToTiles(world, 6, 20)
	if len(tiles) != 20 {
		t.Errorf("expected maxTiles limit 20 to be enforced, got %d", len(tiles))
	}
}

func TestAdjacentTiles(t *testing.T) {
	tile := TileCoord{Zoom: 5, X: 10, Y: 10}
	neighbors := AdjacentTiles(tile)
	if len(neighbors) != 8 {
		t.Errorf("expected 8 neighbors, got %d", len(neighbors))
	}
}
