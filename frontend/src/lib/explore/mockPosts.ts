export interface ExplorePost {
  id: string;
  country: string;
  region: string;
  city: string;
  location: string;
  author: string;
  avatar: string;
  date: string;
  visibility: "everyone" | "friends";
  image?: string;
  caption: string;
  doodleSticker: string;
  likes: number;
  comments: number;
  isTextOnly?: boolean;
  coordinates: [number, number]; // [lng, lat]
  authorId?: string;
  authorCustomId?: string;
}

// Live production posts: initialized empty; strictly populated via backend API
export const MOCK_POSTS: ExplorePost[] = [];

export function getPostsByLocation(
  countryCode?: string,
  regionId?: string,
  visibilityFilter: "everyone" | "friends" = "everyone",
  sourcePosts: ExplorePost[] = MOCK_POSTS
): ExplorePost[] {
  return sourcePosts.filter((post) => {
    // Visibility filter: "everyone" shows all public posts, "friends" shows friends posts
    if (visibilityFilter === "friends" && post.visibility !== "friends") {
      return false;
    }
    if (countryCode && post.country !== countryCode) {
      return false;
    }
    if (regionId && post.region !== regionId) {
      return false;
    }
    return true;
  });
}
