import { ExplorePost } from "@/lib/explore/mockPosts";

export interface PostsFilter {
  country?: string;
  region?: string;
  city?: string;
  visibility?: string;
  limit?: number;
}

export interface CommentData {
  id: string;
  postId: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
}

export interface CreatePostData {
  city: string;
  country: string;
  caption: string;
  region?: string;
  location?: string;
  date?: string;
  visibility?: "everyone" | "friends" | "private";
  image?: string;
  doodleSticker?: string;
  coordinates?: [number, number];
  author?: string;
}

export interface AuthUser {
  id: string;
  custom_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Normalizes raw posts from either the Go backend REST API (Post / PostMarker schema)
 * or the local development posts store into the unified ExplorePost format.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePost(p: any): ExplorePost {
  if (!p) return {} as ExplorePost;

  // Extract coordinates: can be [lng, lat] or separate latitude/longitude
  let coordinates: [number, number] = [0, 0];
  if (Array.isArray(p.coordinates) && p.coordinates.length >= 2) {
    coordinates = [Number(p.coordinates[0]), Number(p.coordinates[1])];
  } else if (p.longitude !== undefined && p.latitude !== undefined) {
    coordinates = [Number(p.longitude), Number(p.latitude)];
  }

  // Extract author name and avatar
  let authorName = "Traveler";
  let avatarUrl = "";
  if (typeof p.author === "string") {
    authorName = p.author;
  } else if (p.author && typeof p.author === "object") {
    authorName = p.author.display_name || p.author.username || "Traveler";
    if (p.author.avatar_url) avatarUrl = p.author.avatar_url;
  } else if (p.author_display_name || p.author_username) {
    authorName = p.author_display_name || p.author_username;
    if (p.author_avatar_url) avatarUrl = p.author_avatar_url;
  }

  // Extract media image
  let imageUrl = p.image || p.thumbnail_url;
  if (!imageUrl && Array.isArray(p.media) && p.media.length > 0) {
    imageUrl = p.media[0].url || p.media[0].thumbnail_url;
  }

  // Extract location names
  const country = p.country || p.country_code || "";
  const location = p.location || p.location_name || "";
  const city = p.city || (location ? location.split(",")[0].trim() : "");

  // Format date
  let dateStr = p.date;
  if (!dateStr) {
    const rawDate = p.visited_at || p.created_at;
    if (rawDate) {
      try {
        dateStr = new Date(rawDate).toISOString().split("T")[0];
      } catch {
        dateStr = new Date().toISOString().split("T")[0];
      }
    } else {
      dateStr = new Date().toISOString().split("T")[0];
    }
  }

  return {
    id: String(p.id),
    country,
    region: p.region || "",
    city,
    location,
    author: authorName,
    avatar: avatarUrl,
    date: dateStr,
    visibility: p.visibility === "public" || p.visibility === "everyone" ? "everyone" : "friends",
    image: imageUrl,
    caption: p.caption || "",
    doodleSticker: p.doodleSticker || "",
    likes: Number(p.likes ?? p.like_count ?? 0),
    comments: Number(p.comments ?? p.comment_count ?? 0),
    isTextOnly: p.isTextOnly ?? (!imageUrl),
    coordinates,
  };
}

export const api = {
  /**
   * Fetch current authenticated user session
   */
  async getMe(): Promise<AuthUser | null> {
    try {
      const res = await fetch("/api/v1/auth/me", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  /**
   * Register a new traveler account
   */
  async register(params: {
    custom_id: string;
    display_name?: string;
    bio?: string;
    password?: string;
  }): Promise<AuthUser> {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Registration failed: ${res.statusText}`);
    }

    return data.user;
  },

  /**
   * Log into an existing traveler account
   */
  async login(params: {
    custom_id: string;
    password?: string;
  }): Promise<AuthUser> {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Login failed: ${res.statusText}`);
    }

    return data.user;
  },

  /**
   * Log out of current traveler account
   */
  async logout(): Promise<void> {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  },

  /**
   * Fetch real posts from backend with optional geographic and visibility filters
   */
  async getPosts(filter?: PostsFilter): Promise<ExplorePost[]> {
    const params = new URLSearchParams();
    if (filter?.country) params.set("country", filter.country);
    if (filter?.region) params.set("region", filter.region);
    if (filter?.city) params.set("city", filter.city);
    if (filter?.visibility) params.set("visibility", filter.visibility);
    if (filter?.limit) params.set("limit", filter.limit.toString());

    const res = await fetch(`/api/v1/posts?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch posts: ${res.statusText}`);
    }

    const data = await res.json();
    const rawList = Array.isArray(data) ? data : (data.posts || []);
    return rawList.map(normalizePost);
  },

  /**
   * Fetch real geo-spatial posts bounded by map viewport
   */
  async getMapPosts(bbox?: string, zoom?: number): Promise<ExplorePost[]> {
    const params = new URLSearchParams();
    if (bbox) params.set("bbox", bbox);
    if (zoom !== undefined) params.set("zoom", zoom.toString());

    const res = await fetch(`/api/v1/posts/map?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch map posts: ${res.statusText}`);
    }

    const data = await res.json();
    // Handles both Go backend format ({ markers: [...] }) and store format ({ posts: [...] })
    const rawList = data.markers || data.posts || (Array.isArray(data) ? data : []);
    return rawList.map(normalizePost);
  },

  /**
   * Publish a new travel post to the backend (requires auth)
   */
  async createPost(post: CreatePostData): Promise<ExplorePost> {
    const lat = post.coordinates ? post.coordinates[1] : 0;
    const lon = post.coordinates ? post.coordinates[0] : 0;

    const payload = {
      ...post,
      latitude: lat,
      longitude: lon,
      location_name: post.location || `${post.city}, ${post.country}`,
      country_code: post.country,
      visibility: post.visibility === "friends" ? "friends" : "public",
      media: post.image ? [{ object_key: post.image, width: 600, height: 420, sort_order: 0 }] : [],
    };

    const res = await fetch("/api/v1/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Failed to create post: ${res.statusText}`);
    }

    return normalizePost(data.post || data);
  },

  /**
   * Toggle like on a post in the backend (requires auth)
   */
  async toggleLike(postId: string): Promise<{ likes: number; liked: boolean }> {
    const res = await fetch(`/api/v1/posts/${postId}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Failed to toggle like: ${res.statusText}`);
    }

    return data;
  },

  /**
   * Fetch comments for a post from the backend (free browsing)
   */
  async getComments(postId: string): Promise<CommentData[]> {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch comments: ${res.statusText}`);
    }

    const data = await res.json();
    return data.comments || [];
  },

  /**
   * Add a new comment to a post in the backend (requires auth)
   */
  async addComment(postId: string, text: string): Promise<CommentData> {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content: text, text }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Failed to add comment: ${res.statusText}`);
    }

    return data.comment || data;
  },

  /**
   * Check whether a candidate @handle is valid and available (debounced on typing)
   */
  async checkHandle(handle: string): Promise<{
    available: boolean;
    valid: boolean;
    message: string;
    isCurrent?: boolean;
    isTaken?: boolean;
  }> {
    const res = await fetch(`/api/v1/users/check-handle?handle=${encodeURIComponent(handle)}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json().catch(() => ({
      available: false,
      valid: false,
      message: "Network error checking handle",
    }));
    return data;
  },

  /**
   * Update current user's @handle / custom ID in profile settings
   */
  async updateCustomId(custom_id: string): Promise<{ custom_id: string; message: string }> {
    const res = await fetch("/api/v1/users/custom-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ custom_id }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `Failed to update handle: ${res.statusText}`);
      if (res.status === 409 || data.code === "HANDLE_CONFLICT") {
        (err as any).isConflict = true;
      }
      throw err;
    }

    return data;
  },

  /**
   * Fetch public traveler profile and their posts
   */
  async getUserProfile(username: string): Promise<any> {
    const res = await fetch(`/api/v1/users/${encodeURIComponent(username)}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Traveler not found`);
    }

    return data.user || data.profile || data;
  },

  /**
   * Fetch current user's friends list
   */
  async getFriends(): Promise<AuthUser[]> {
    const res = await fetch("/api/v1/friends", {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return data.friends || [];
  },

  /**
   * Add a traveler as friend by their @handle
   */
  async addFriend(custom_id: string): Promise<AuthUser> {
    const res = await fetch("/api/v1/friends/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ custom_id }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Failed to add friend`);
    }

    return data.friend || data;
  },

  /**
   * Remove a friend
   */
  async removeFriend(friendId: string): Promise<void> {
    const res = await fetch(`/api/v1/friends/${friendId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to remove friend`);
    }
  },
};
