import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox") || undefined;
  const zoomParam = searchParams.get("zoom");
  const zoom = zoomParam ? parseInt(zoomParam, 10) : undefined;

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/posts/map?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback to local store
    }
  }

  const posts = postsStore.getMapPosts(bbox, zoom);
  return NextResponse.json({
    posts,
    clusters: [],
    total: posts.length,
  });
}
