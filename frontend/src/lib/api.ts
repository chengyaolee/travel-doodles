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

export const api = {
  /**
   * Fetch posts with optional geographic and visibility filters
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
    return data.posts || [];
  },

  /**
   * Fetch geo-spatial posts bounded by map viewport
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
    return data.posts || [];
  },

  /**
   * Create a new travel post
   */
  async createPost(post: CreatePostData): Promise<ExplorePost> {
    const res = await fetch("/api/v1/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });

    if (!res.ok) {
      throw new Error(`Failed to create post: ${res.statusText}`);
    }

    const data = await res.json();
    return data.post;
  },

  /**
   * Toggle like on a post
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
   * Fetch comments for a post
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
   * Add a new comment to a post
   */
  async addComment(postId: string, text: string): Promise<CommentData> {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error(`Failed to add comment: ${res.statusText}`);
    }

    const data = await res.json();
    return data.comment;
  },
};
