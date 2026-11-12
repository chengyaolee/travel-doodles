import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

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
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/posts?${searchParams.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
          ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
        },
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

// POST /api/v1/posts - Only interactions require an account
export async function POST(request: NextRequest) {
  try {
    const authUser = userStore.getAuthUser(request);

    // If live Go backend configured, proxy to Go backend
    if (BACKEND_URL) {
      try {
        const body = await request.clone().json();
        const lat = body.latitude ?? (body.coordinates ? body.coordinates[1] : 0);
        const lon = body.longitude ?? (body.coordinates ? body.coordinates[0] : 0);
        const goPayload = {
          caption: body.caption || "",
          latitude: lat,
          longitude: lon,
          location_name: body.location || `${body.city || ""}, ${body.country || ""}`.trim(),
          country_code: body.country || body.country_code || "",
          visibility: body.visibility === "everyone" ? "public" : (body.visibility || "public"),
          media: body.image ? [{ object_key: body.image, width: 600, height: 420, sort_order: 0 }] : [],
        };

        const res = await fetch(`${BACKEND_URL}/api/v1/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
            ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
          },
          body: JSON.stringify(goPayload),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: 201 });
        } else if (res.status === 401) {
          return NextResponse.json(
            { error: "Authentication required to create a post. Please log in or create an account." },
            { status: 401 }
          );
        }
      } catch {
        // Fallback to local server store
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to create a post. Please log in or create an account." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const postPayload = {
      ...body,
      author: authUser.display_name || authUser.username,
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
