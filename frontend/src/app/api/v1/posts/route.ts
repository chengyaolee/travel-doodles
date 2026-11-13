import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { getBackendUrl, resolveAuthUser } from "@/lib/server/backendUrl";

// GET /api/v1/posts - Free browsing for everyone (no account required)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || undefined;
  const region = searchParams.get("region") || undefined;
  const city = searchParams.get("city") || undefined;
  const visibility = searchParams.get("visibility") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // If a live Go backend URL is configured, forward directly
  const backendUrl = getBackendUrl();
  if (backendUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${backendUrl}/api/v1/posts?${searchParams.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
          ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
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

// POST /api/v1/posts - Only interactions require an account
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const backendUrl = getBackendUrl();

    // If live Go backend configured, proxy to Go backend
    if (backendUrl) {
      try {
        const lat = rawBody.latitude ?? (rawBody.coordinates ? rawBody.coordinates[1] : 0);
        const lon = rawBody.longitude ?? (rawBody.coordinates ? rawBody.coordinates[0] : 0);
        const goPayload = {
          caption: rawBody.caption || "",
          latitude: lat,
          longitude: lon,
          location_name: rawBody.location || `${rawBody.city || ""}, ${rawBody.country || ""}`.trim(),
          country_code: rawBody.country || rawBody.country_code || "",
          visibility: rawBody.visibility === "everyone" ? "public" : (rawBody.visibility || "public"),
          media: rawBody.image ? [{ object_key: rawBody.image, width: 600, height: 420, sort_order: 0 }] : [],
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${backendUrl}/api/v1/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
            ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
          },
          body: JSON.stringify(goPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: 201 });
        } else if (res.status !== 401) {
          const errorData = await res.json().catch(() => ({ error: `Backend error: ${res.statusText}` }));
          return NextResponse.json(errorData, { status: res.status });
        }
      } catch (proxyErr) {
        console.warn("Go backend proxy unreachable, falling back to local store:", proxyErr);
      }
    }

    // Resolve user across local userStore and Bearer token / cookies
    const authUser = await resolveAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to create a post. Please log in or create an account." },
        { status: 401 }
      );
    }

    const postPayload = {
      ...rawBody,
      author: authUser.display_name || authUser.custom_id,
      authorId: authUser.id,
      authorCustomId: authUser.custom_id,
      avatar: authUser.avatar_url,
    };

    const post = postsStore.createPost(postPayload);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid post payload", details: String(error) },
      { status: 400 }
    );
  }
}
