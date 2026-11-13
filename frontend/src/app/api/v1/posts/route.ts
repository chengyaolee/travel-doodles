import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { getBackendUrl } from "@/lib/server/backendUrl";

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

    // If live Go backend configured, proxy to Go backend — NO fallback to local store
    if (backendUrl) {
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

      let res: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        res = await fetch(`${backendUrl}/api/v1/posts`, {
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
      } catch (proxyErr) {
        console.error("Go backend proxy unreachable for POST /posts:", proxyErr);
        return NextResponse.json(
          { error: "Backend server is unreachable. Please try again later." },
          { status: 502 }
        );
      }

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201 });
      } else {
        const errorData = await res.json().catch(() => ({ error: `Backend error: ${res.statusText}` }));
        return NextResponse.json(errorData, { status: res.status });
      }
    }

    // No backend configured — refuse instead of silently saving to a local JSON file
    return NextResponse.json(
      { error: "Upload failed: backend database is not configured (set BACKEND_URL)." },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid post payload", details: String(error) },
      { status: 400 }
    );
  }
}
