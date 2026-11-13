import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const decoded = decodeURIComponent(username);

  // Proxy to live Go backend if active
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${encodeURIComponent(decoded)}`, {
        headers: {
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
          ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const profile = data.profile || data.user || data;
        const normalizedPosts = (profile.posts || []).map((p: any) => ({
          id: String(p.id),
          caption: p.caption || "",
          latitude: p.latitude ?? 0,
          longitude: p.longitude ?? 0,
          location: p.location_name || "",
          city: p.city || (p.location_name ? p.location_name.split(",")[0].trim() : ""),
          country: p.country_code || p.country || "",
          region: p.region || "",
          visibility: p.visibility === "everyone" ? "everyone" : (p.visibility || "everyone"),
          image: p.image || p.url || (Array.isArray(p.media) && p.media.length > 0 ? (p.media[0].url || p.media[0].thumbnail_url) : ""),
          author: profile.display_name || profile.username || profile.custom_id || "Traveler",
          avatar: profile.avatar_url || profile.avatar || "",
          likes: p.like_count ?? p.likes ?? 0,
          comments: p.comment_count ?? p.comments ?? 0,
          coordinates: [p.longitude ?? 0, p.latitude ?? 0],
          date: p.visited_at ? String(p.visited_at).split("T")[0] : (p.created_at ? String(p.created_at).split("T")[0] : new Date().toISOString().split("T")[0]),
        }));

        const visitedCountries = Array.from(new Set(normalizedPosts.map((p: any) => p.country).filter(Boolean)));

        return NextResponse.json({
          user: {
            id: profile.id,
            username: profile.custom_id || profile.username,
            name: profile.display_name || profile.username,
            bio: profile.bio || "",
            avatar: profile.avatar_url || profile.avatar || "",
            countriesCount: visitedCountries.length,
            memoriesCount: profile.post_count ?? normalizedPosts.length,
            followersCount: profile.follower_count ?? 0,
            posts: normalizedPosts,
          },
          profile: {
            ...profile,
            posts: normalizedPosts,
          },
        });
      }
    } catch {
      // Fallback
    }
  }

  // Look up user in real database
  const user = userStore.findByCustomId(decoded);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { posts } = postsStore.getPosts();
  const userPosts = posts.filter(
    (p) =>
      p.author.toLowerCase() === user.custom_id.toLowerCase() ||
      p.author.toLowerCase() === user.display_name.toLowerCase()
  );

  const visitedCountries = Array.from(new Set(userPosts.map((p) => p.country).filter(Boolean)));

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.custom_id,
      name: user.display_name,
      bio: user.bio,
      avatar: user.avatar_url,
      countriesCount: visitedCountries.length,
      memoriesCount: userPosts.length,
      followersCount: 0,
      posts: userPosts,
    },
  });
}
