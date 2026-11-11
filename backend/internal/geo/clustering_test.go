package geo

import (
	"testing"
	"time"
)

func TestClusterPostsInMemory_LowZoom(t *testing.T) {
	now := time.Now()
	// Three posts close together in Paris
	posts := []PostMarker{
		{ID: "p1", Latitude: 48.8566, Longitude: 2.3522, Caption: "Eiffel", CreatedAt: now},
		{ID: "p2", Latitude: 48.8584, Longitude: 2.2945, Caption: "Louvre", CreatedAt: now},
		{ID: "p3", Latitude: 48.8606, Longitude: 2.3376, Caption: "Montmartre", CreatedAt: now},
		// One post far away in Tokyo
		{ID: "p4", Latitude: 35.6762, Longitude: 139.6503, Caption: "Tokyo Tower", CreatedAt: now},
	}

	// At zoom 3, Paris posts should aggregate into 1 cluster
	resp := ClusterPostsInMemory(posts, 3)

	if len(resp.Clusters) != 2 {
		t.Fatalf("expected 2 clusters (Paris and Tokyo), got %d", len(resp.Clusters))
	}

	var parisCluster, tokyoCluster *Cluster
	for i := range resp.Clusters {
		cl := &resp.Clusters[i]
		if cl.Count == 3 {
			parisCluster = cl
		} else if cl.Count == 1 {
			tokyoCluster = cl
		}
	}

	if parisCluster == nil {
		t.Errorf("expected Paris cluster with count 3")
	}
	if tokyoCluster == nil {
		t.Errorf("expected Tokyo cluster with count 1")
	}
}

func TestClusterPostsInMemory_HighZoom(t *testing.T) {
	now := time.Now()
	posts := []PostMarker{
		{ID: "p1", Latitude: 48.8566, Longitude: 2.3522, Caption: "Eiffel", CreatedAt: now},
		{ID: "p2", Latitude: 48.8584, Longitude: 2.2945, Caption: "Louvre", CreatedAt: now},
	}

	// At zoom 15, no clustering should happen; all returned as individual markers
	resp := ClusterPostsInMemory(posts, 15)
	if len(resp.Clusters) != 0 {
		t.Errorf("expected 0 clusters at zoom 15, got %d", len(resp.Clusters))
	}
	if len(resp.Markers) != 2 {
		t.Errorf("expected 2 raw markers at zoom 15, got %d", len(resp.Markers))
	}
}
