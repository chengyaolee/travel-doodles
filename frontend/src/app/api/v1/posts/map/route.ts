import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { getBackendUrl } from "@/lib/server/backendUrl";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox") || undefined;
  const zoomParam = searchParams.get("zoom");
  const zoom = zoomParam ? parseInt(zoomParam, 10) : undefined;
  const backendUrl = getBackendUrl();

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/v1/posts/map?${searchParams.toString()}`, {
        headers: {
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
          ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
        },
      });
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
    markers: posts,
    clusters: [],
    total: posts.length,
  });
}
