package media

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"io"

	"golang.org/x/image/draw"
)

const (
	MaxImageDimension = 6000     // Maximum width or height
	MaxPixelCount     = 36000000 // 36 Megapixels to prevent decompression bombs
	ThumbnailWidth    = 400
	ThumbnailHeight   = 400
)

var (
	ErrDecompressionBomb = errors.New("image dimensions exceed safe limits")
	ErrUnsupportedFormat = errors.New("unsupported image format")
)

type ProcessedImage struct {
	OriginalData []byte
	Thumbnail    []byte
	Width        int
	Height       int
	ContentType  string
}

// ProcessAndSanitizeImage decodes the image, verifies dimensions against decompression bombs,
// strips all EXIF metadata (including GPS coordinates) by re-encoding, and generates an optimized thumbnail
func ProcessAndSanitizeImage(data []byte) (*ProcessedImage, error) {
	// 1. Inspect config without full decode
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image config: %w", err)
	}

	// 2. Validate dimensions against decompression bomb attacks
	if cfg.Width > MaxImageDimension || cfg.Height > MaxImageDimension {
		return nil, fmt.Errorf("%w: %dx%d exceeds maximum %dx%d", ErrDecompressionBomb, cfg.Width, cfg.Height, MaxImageDimension, MaxImageDimension)
	}

	pixelCount := int64(cfg.Width) * int64(cfg.Height)
	if pixelCount > MaxPixelCount {
		return nil, fmt.Errorf("%w: %d pixels exceeds safety threshold", ErrDecompressionBomb, pixelCount)
	}

	// 3. Decode full image
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	// 4. Generate Thumbnail with proportional aspect ratio
	var thumbW, thumbH int
	if width > height {
		thumbW = ThumbnailWidth
		thumbH = int(float64(height) * float64(ThumbnailWidth) / float64(width))
	} else {
		thumbH = ThumbnailHeight
		thumbW = int(float64(width) * float64(ThumbnailHeight) / float64(height))
	}
	if thumbW <= 0 {
		thumbW = 1
	}
	if thumbH <= 0 {
		thumbH = 1
	}

	thumbImg := image.NewRGBA(image.Rect(0, 0, thumbW, thumbH))
	draw.CatmullRom.Scale(thumbImg, thumbImg.Bounds(), img, bounds, draw.Over, nil)

	var thumbBuf bytes.Buffer
	// Encode thumbnail as clean JPEG (quality 85) - strips all EXIF GPS metadata
	if err := jpeg.Encode(&thumbBuf, thumbImg, &jpeg.Options{Quality: 85}); err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail: %w", err)
	}

	// 5. Clean original image (re-encode to strip EXIF GPS metadata)
	var cleanBuf bytes.Buffer
	var outContentType string

	if format == "png" {
		if err := png.Encode(&cleanBuf, img); err != nil {
			return nil, err
		}
		outContentType = "image/png"
	} else {
		if err := jpeg.Encode(&cleanBuf, img, &jpeg.Options{Quality: 90}); err != nil {
			return nil, err
		}
		outContentType = "image/jpeg"
	}

	return &ProcessedImage{
		OriginalData: cleanBuf.Bytes(),
		Thumbnail:    thumbBuf.Bytes(),
		Width:        width,
		Height:       height,
		ContentType:  outContentType,
	}, nil
}

// SniffContentType reads the first 512 bytes to determine actual MIME type
func SniffContentType(r io.Reader) (string, error) {
	buf := make([]byte, 512)
	n, err := io.ReadFull(r, buf)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return "", err
	}
	contentType := httpDetectContentType(buf[:n])
	return contentType, nil
}

func httpDetectContentType(data []byte) string {
	// Verify standard magic signatures
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}
	if len(data) >= 8 && bytes.Equal(data[:8], []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}) {
		return "image/png"
	}
	if len(data) >= 12 && bytes.Equal(data[:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WEBP")) {
		return "image/webp"
	}
	return "application/octet-stream"
}
