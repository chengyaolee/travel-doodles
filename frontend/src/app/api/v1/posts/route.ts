import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";

// Optional proxy to Go backend if active
const BACKEND_URL = process.env.BACKEND_URL || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || undefined;
  const region = searchParams.get("region") || undefined;
  const city = searchParams.get("city") || undefined;
  const visibility = searchParams.get("visibility") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // If a live Go backend URL is configured, attempt to proxy first
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/posts?${searchParams.toString()}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback to local server store
    }
  }

  const result = postsStore.getPosts({ country, region, city, visibility, limit });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // If a live Go backend URL is configured, attempt to forward
    if (BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: 201 });
        }
      } catch {
        // Fallback to local server store
      }
    }

    const post = postsStore.createPost(body);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid post payload", details: String(error) },
      { status: 400 }
    );
  }
}
