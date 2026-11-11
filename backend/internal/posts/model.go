package posts

import (
	"time"
)

type MediaItem struct {
	ID           string `json:"id,omitempty"`
	ObjectKey    string `json:"object_key"`
	ThumbnailKey string `json:"thumbnail_key,omitempty"`
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnail_url,omitempty"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	SortOrder    int    `json:"sort_order"`
}

type PostAuthor struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

type Post struct {
	ID           string      `json:"id"`
	Author       PostAuthor  `json:"author"`
	Caption      string      `json:"caption"`
	Latitude     float64     `json:"latitude"`
	Longitude    float64     `json:"longitude"`
	LocationName string      `json:"location_name"`
	CountryCode  string      `json:"country_code"`
	Visibility   string      `json:"visibility"` // 'public', 'friends', 'private'
	LikeCount    int         `json:"like_count"`
	CommentCount int         `json:"comment_count"`
	HasLiked     bool        `json:"has_liked"`
	Media        []MediaItem `json:"media"`
	VisitedAt    *time.Time  `json:"visited_at,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

type CreateMediaInput struct {
	ObjectKey string `json:"object_key"`
	Width     int    `json:"width"`
	Height    int    `json:"height"`
	SortOrder int    `json:"sort_order"`
}

type CreatePostRequest struct {
	Caption      string             `json:"caption"`
	Latitude     float64            `json:"latitude"`
	Longitude    float64            `json:"longitude"`
	LocationName string             `json:"location_name"`
	CountryCode  string             `json:"country_code"`
	Visibility   string             `json:"visibility"` // 'public', 'friends', 'private'
	VisitedAt    *time.Time         `json:"visited_at,omitempty"`
	Media        []CreateMediaInput `json:"media"`
}

type UpdatePostRequest struct {
	Caption      *string `json:"caption,omitempty"`
	Visibility   *string `json:"visibility,omitempty"`
	LocationName *string `json:"location_name,omitempty"`
}

type PaginatedPosts struct {
	Posts      []Post  `json:"posts"`
	NextCursor *string `json:"next_cursor,omitempty"`
	HasMore    bool    `json:"has_more"`
}
