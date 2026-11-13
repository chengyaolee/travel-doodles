import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";
import { getBackendUrl } from "@/lib/server/backendUrl";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const custom_id = (body.custom_id || body.username || "").trim();
    const display_name = (body.display_name || body.name || custom_id).trim();
    const bio = (body.bio || "").trim();
    const password = body.password || "";

    if (!custom_id) {
      return NextResponse.json(
        { error: "A unique Traveler ID (custom_id) is required." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(custom_id)) {
      return NextResponse.json(
        { error: "Traveler ID must be 3-30 characters (letters, numbers, underscores only)." },
        { status: 400 }
      );
    }

    // If live Go backend configured, proxy to Go backend — NO fallback to local store
    const backendUrl = getBackendUrl();
    if (backendUrl) {
      let goRes: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        goRes = await fetch(`${backendUrl}/api/v1/auth/passwordless/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custom_id, display_name, bio }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (proxyErr) {
        console.error("Go backend register unreachable:", proxyErr);
        return NextResponse.json(
          { error: "Backend server is unreachable. Please try again later." },
          { status: 502 }
        );
      }

      if (goRes.ok) {
        const data = await goRes.json();
        const cookieHeader = goRes.headers.get("set-cookie");
        let sessionToken = data.token || "";
        if (!sessionToken && cookieHeader) {
          const match = cookieHeader.match(/travel_session=([^;]+)/);
          if (match) sessionToken = match[1];
        }

        const response = NextResponse.json(
          { ...data, token: sessionToken, message: "Welcome to Travel Doodles!" },
          { status: 201 }
        );
        if (cookieHeader) response.headers.set("set-cookie", cookieHeader);
        if (sessionToken) {
          response.cookies.set("travel_session", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
          });
        }
        return response;
      } else {
        const errData = await goRes.json().catch(() => ({}));
        return NextResponse.json(errData, { status: goRes.status });
      }
    }

    const safeUser = userStore.createUser({
      custom_id,
      display_name,
      bio,
    });

    const sessionToken = userStore.createSession(safeUser.id);

    const response = NextResponse.json(
      { user: safeUser, token: sessionToken, message: "Welcome to Travel Doodles!" },
      { status: 201 }
    );

    response.cookies.set("travel_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create account";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
