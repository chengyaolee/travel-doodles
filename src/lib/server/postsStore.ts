import fs from "fs";
import path from "path";
import { MOCK_POSTS, type ExplorePost } from "../explore/mockPosts.ts";

// File path for persistence in development
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "posts.json");
const COMMENTS_FILE = path.join(DATA_DIR, "comments.json");

export interface CommentItem {
  id: string;
  postId: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
}

// In-memory cache for fast responses
let cachedPosts: ExplorePost[] | null = null;
let cachedComments: Record<string, CommentItem[]> | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function loadPosts(): ExplorePost[] {
  if (cachedPosts) return cachedPosts;

  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      cachedPosts = JSON.parse(content);
      return cachedPosts!;
    } catch (e) {
      console.warn("Could not read posts.json, falling back to seed data", e);
    }
  }

  // Seed with rich default posts collection
  cachedPosts = [...MOCK_POSTS];
  savePosts(cachedPosts);
  return cachedPosts;
}

function savePosts(posts: ExplorePost[]) {
  cachedPosts = posts;
  ensureDataDir();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not persist posts.json", e);
  }
}

function loadComments(): Record<string, CommentItem[]> {
  if (cachedComments) return cachedComments;

  ensureDataDir();
  if (fs.existsSync(COMMENTS_FILE)) {
    try {
      const content = fs.readFileSync(COMMENTS_FILE, "utf-8");
      cachedComments = JSON.parse(content);
      return cachedComments!;
    } catch {
      // ignore
    }
  }

  // Seed comments for sample posts
  cachedComments = {
    "post-jp-1": [
      {
        id: "c-1",
        postId: "post-jp-1",
        author: "Sarah Jenkins",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
        text: "The reflections on the pavement look unreal! Shibuya rain is magical.",
        createdAt: "2026-05-02T10:14:00Z",
      },
      {
        id: "c-2",
        postId: "post-jp-1",
        author: "Alex Rivera",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
        text: "Was this near the Starbucks second floor view?",
        createdAt: "2026-05-02T14:30:00Z",
      },
    ],
    "post-fr-1": [
      {
        id: "c-3",
        postId: "post-fr-1",
        author: "Jordan Smith",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
        text: "That boulangerie in Le Marais is heaven. Did you try the pistachio escargot?",
        createdAt: "2026-04-29T09:20:00Z",
      },
    ],
  };
  return cachedComments;
}

function saveComments(comments: Record<string, CommentItem[]>) {
  cachedComments = comments;
  ensureDataDir();
  try {
    fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

export const postsStore = {
  getPosts(filter?: {
    country?: string;
    region?: string;
    city?: string;
    visibility?: string;
    limit?: number;
    cursor?: string;
  }): { posts: ExplorePost[]; total: number } {
    let posts = loadPosts();

    if (filter?.country) {
      const c = filter.country.toUpperCase();
      posts = posts.filter((p) => p.country.toUpperCase() === c);
    }
    if (filter?.region) {
      const r = filter.region.toLowerCase();
      posts = posts.filter((p) => p.region.toLowerCase() === r);
    }
    if (filter?.city) {
      const city = filter.city.toLowerCase();
      posts = posts.filter((p) => p.city.toLowerCase().includes(city));
    }
    if (filter?.visibility && filter.visibility !== "everyone") {
      posts = posts.filter((p) => p.visibility === filter.visibility);
    }

    const total = posts.length;
    if (filter?.limit && filter.limit > 0) {
      posts = posts.slice(0, filter.limit);
    }

    return { posts, total };
  },

  getPostById(id: string): ExplorePost | null {
    const posts = loadPosts();
    return posts.find((p) => p.id === id) || null;
  },

  createPost(newPostData: Partial<ExplorePost>): ExplorePost {
    const posts = loadPosts();

    // Country coordinates catalog fallback
    const cityCoords: Record<string, [number, number]> = {
      kyoto: [135.7681, 35.0116],
      tokyo: [139.6917, 35.6895],
      paris: [2.3522, 48.8566],
      "new york": [-74.006, 40.7128],
      rome: [12.4964, 41.9028],
      london: [-0.1278, 51.5074],
      "cape town": [18.4241, -33.9249],
      sydney: [151.2093, -33.8688],
      "rio de janeiro": [-43.1729, -22.9068],
      bali: [115.1889, -8.4095],
      barcelona: [2.1734, 41.3851],
    };

    const cityName = (newPostData.city || "").toLowerCase().trim();
    const defaultCoords = cityCoords[cityName] || [15, 25];

    const post: ExplorePost = {
      id: "post-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      country: (newPostData.country || "JP").toUpperCase().slice(0, 2),
      region: newPostData.region || "",
      city: newPostData.city || "Kyoto",
      location: newPostData.location || `${newPostData.city}, ${newPostData.country}`,
      author: newPostData.author || "You (Explorer)",
      avatar:
        newPostData.avatar ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      date: newPostData.date || new Date().toISOString().split("T")[0],
      visibility: (newPostData.visibility as "everyone" | "friends") || "everyone",
      image: newPostData.image || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=420&fit=crop",
      caption: newPostData.caption || "",
      doodleSticker: newPostData.doodleSticker || "📍",
      likes: 1,
      comments: 0,
      coordinates: newPostData.coordinates || defaultCoords,
    };

    // Prepend so new posts appear first
    const updated = [post, ...posts];
    savePosts(updated);
    return post;
  },

  toggleLike(postId: string): { likes: number; liked: boolean } {
    const posts = loadPosts();
    const index = posts.findIndex((p) => p.id === postId);
    if (index === -1) return { likes: 0, liked: false };

    const post = { ...posts[index] };
    const liked = (post as unknown as { _userLiked?: boolean })._userLiked || false;

    if (liked) {
      post.likes = Math.max(0, post.likes - 1);
      (post as unknown as { _userLiked?: boolean })._userLiked = false;
    } else {
      post.likes += 1;
      (post as unknown as { _userLiked?: boolean })._userLiked = true;
    }

    posts[index] = post;
    savePosts(posts);
    return { likes: post.likes, liked: !liked };
  },

  getComments(postId: string): CommentItem[] {
    const comments = loadComments();
    return comments[postId] || [];
  },

  addComment(postId: string, text: string, author?: string): CommentItem {
    const comments = loadComments();
    const newComment: CommentItem = {
      id: "c-" + Date.now(),
      postId,
      author: author || "You (Explorer)",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      text,
      createdAt: new Date().toISOString(),
    };

    if (!comments[postId]) {
      comments[postId] = [];
    }
    comments[postId].push(newComment);
    saveComments(comments);

    // Update comment count on post
    const posts = loadPosts();
    const p = posts.find((item) => item.id === postId);
    if (p) {
      p.comments = (p.comments || 0) + 1;
      savePosts(posts);
    }

    return newComment;
  },

  getMapPosts(bbox?: string, zoom?: number): ExplorePost[] {
    const posts = loadPosts();
    if (!bbox) return posts.slice(0, 60);

    const parts = bbox.split(",").map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return posts.slice(0, 60);

    const [minLon, minLat, maxLon, maxLat] = parts;
    const inBounds = posts.filter((p) => {
      const [lon, lat] = p.coordinates;
      return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
    });

    return inBounds.slice(0, zoom && zoom > 6 ? 100 : 50);
  },
};
