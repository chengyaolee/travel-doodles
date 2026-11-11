import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;
  const decoded = decodeURIComponent(username);

  const { posts } = postsStore.getPosts();
  const userPosts = posts.filter(
    (p) =>
      p.author.toLowerCase() === decoded.toLowerCase() ||
      decoded.toLowerCase() === "me" ||
      decoded.toLowerCase() === "explorer"
  );

  const visitedCountries = Array.from(new Set(userPosts.map((p) => p.country)));

  return NextResponse.json({
    user: {
      username: decoded,
      name: decoded === "me" ? "Alex Morgan" : decoded,
      bio: "Illustrator & backpacker. Drawing coffee shops, mountain passes, and train stations from every country I step foot in.",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=face",
      countriesCount: Math.max(18, visitedCountries.length),
      memoriesCount: Math.max(42, userPosts.length),
      followersCount: 1840,
      posts: userPosts.slice(0, 12),
    },
  });
}
