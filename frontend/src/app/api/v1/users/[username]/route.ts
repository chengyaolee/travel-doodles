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
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${encodeURIComponent(decoded)}`);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
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
