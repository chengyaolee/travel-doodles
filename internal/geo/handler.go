package geo

import (
	"encoding/json"
	"net/http"
	"strconv"

	"travel-doodles/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetMapPosts(w http.ResponseWriter, r *http.Request) {
	bboxStr := r.URL.Query().Get("bbox")
	if bboxStr == "" {
		writeError(w, http.StatusBadRequest, "bbox parameter is required (format: minLon,minLat,maxLon,maxLat)")
		return
	}

	bbox, err := ParseBBox(bboxStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	zoomStr := r.URL.Query().Get("zoom")
	zoom := 5
	if zoomStr != "" {
		if z, err := strconv.Atoi(zoomStr); err == nil && z >= 0 && z <= 22 {
			zoom = z
		}
	}

	limit := 50
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	var viewerID string
	if u := auth.UserFromContext(r.Context()); u != nil {
		viewerID = u.ID
	}

	resp, err := h.service.GetMapPosts(r.Context(), bbox, zoom, viewerID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get map posts")
		return
	}

	// Calculate and provide adjacent prefetch tile hints
	if zoom <= 14 {
		tiles := BBoxToTiles(bbox, zoom, 4)
		if len(tiles) > 0 {
			neighbors := AdjacentTiles(tiles[0])
			w.Header().Set("X-Prefetch-Hints", strconv.Itoa(len(neighbors)))
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) GetNearbyPosts(w http.ResponseWriter, r *http.Request) {
	lonStr := r.URL.Query().Get("lon")
	latStr := r.URL.Query().Get("lat")

	if lonStr == "" || latStr == "" {
		writeError(w, http.StatusBadRequest, "lat and lon query parameters are required")
		return
	}

	lon, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid lon parameter")
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid lat parameter")
		return
	}

	radiusKm := 25.0
	if rStr := r.URL.Query().Get("radius_km"); rStr != "" {
		if rKm, err := strconv.ParseFloat(rStr, 64); err == nil {
			radiusKm = rKm
		}
	}

	limit := 20
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil {
			limit = l
		}
	}

	var viewerID string
	if u := auth.UserFromContext(r.Context()); u != nil {
		viewerID = u.ID
	}

	markers, err := h.service.GetNearbyPosts(r.Context(), lon, lat, radiusKm, viewerID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch nearby posts")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"posts": markers,
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{
		"error": message,
	})
}
