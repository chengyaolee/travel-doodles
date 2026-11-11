package media

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"testing"
)

func TestProcessAndSanitizeImage(t *testing.T) {
	// Create a simple test image (800x600 red image)
	img := image.NewRGBA(image.Rect(0, 0, 800, 600))
	for x := 0; x < 800; x++ {
		for y := 0; y < 600; y++ {
			img.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, nil); err != nil {
		t.Fatalf("failed to encode test jpeg: %v", err)
	}

	processed, err := ProcessAndSanitizeImage(buf.Bytes())
	if err != nil {
		t.Fatalf("ProcessAndSanitizeImage failed: %v", err)
	}

	if processed.Width != 800 || processed.Height != 600 {
		t.Errorf("expected dimensions 800x600, got %dx%d", processed.Width, processed.Height)
	}

	// Verify thumbnail was created and is smaller
	if len(processed.Thumbnail) == 0 {
		t.Errorf("expected non-empty thumbnail bytes")
	}

	thumbCfg, _, err := image.DecodeConfig(bytes.NewReader(processed.Thumbnail))
	if err != nil {
		t.Fatalf("failed to decode thumbnail config: %v", err)
	}

	if thumbCfg.Width > ThumbnailWidth {
		t.Errorf("expected thumbnail width <= %d, got %d", ThumbnailWidth, thumbCfg.Width)
	}
}

func TestProcessAndSanitizeImage_DecompressionBomb(t *testing.T) {
	// Simulate an oversized image config (e.g. 10000 x 10000)
	// We construct a mock buffer that reports oversized dimensions
	oversized := image.NewRGBA(image.Rect(0, 0, MaxImageDimension+1, 100))
	var buf bytes.Buffer
	_ = jpeg.Encode(&buf, oversized, nil)

	_, err := ProcessAndSanitizeImage(buf.Bytes())
	if err == nil {
		t.Fatalf("expected error for image exceeding MaxImageDimension")
	}
}
