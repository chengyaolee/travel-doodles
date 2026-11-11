package friends

import "time"

type Friend struct {
	ID           string    `json:"id"`
	CustomID     string    `json:"custom_id"`
	Username     string    `json:"username"`
	DisplayName  string    `json:"display_name"`
	AvatarURL    string    `json:"avatar_url,omitempty"`
	Source       string    `json:"source"` // 'id', 'link'
	FriendsSince time.Time `json:"friends_since"`
}

type FriendInvite struct {
	ID               string     `json:"id"`
	Code             string     `json:"code"`
	InviteURL        string     `json:"invite_url"`
	InviterID        string     `json:"inviter_id"`
	InviterCustomID  string     `json:"inviter_custom_id"`
	InviterName      string     `json:"inviter_name"`
	InviterAvatarURL string     `json:"inviter_avatar_url,omitempty"`
	MaxUses          int        `json:"max_uses"`
	UsesCount        int        `json:"uses_count"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type AddFriendByIDRequest struct {
	CustomID string `json:"custom_id"`
}

type CreateInviteRequest struct {
	MaxUses     int `json:"max_uses"`     // 0 = unlimited
	ExpireHours int `json:"expire_hours"` // 0 = no expiration
}
