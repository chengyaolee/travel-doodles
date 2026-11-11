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
  let avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";
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
   * Publish a new travel post to the backend
   */
  async createPost(post: CreatePostData): Promise<ExplorePost> {
    const lat = post.coordinates ? post.coordinates[1] : 0;
    const lon = post.coordinates ? post.coordinates[0] : 0;

    // Build payload compatible with both Go backend & local store
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
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to create post: ${res.statusText}`);
    }

    const data = await res.json();
    return normalizePost(data.post || data);
  },

  /**
   * Toggle like on a post in the backend
   */
  async toggleLike(postId: string): Promise<{ likes: number; liked: boolean }> {
    const res = await fetch(`/api/v1/posts/${postId}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Failed to toggle like: ${res.statusText}`);
    }

    return await res.json();
  },

  /**
   * Fetch comments for a post from the backend
   */
  async getComments(postId: string): Promise<CommentData[]> {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch comments: ${res.statusText}`);
    }

    const data = await res.json();
    return data.comments || [];
  },

  /**
   * Add a new comment to a post in the backend
   */
  async addComment(postId: string, text: string): Promise<CommentData> {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, text }),
    });

    if (!res.ok) {
      throw new Error(`Failed to add comment: ${res.statusText}`);
    }

    const data = await res.json();
    return data.comment || data;
  },
};
