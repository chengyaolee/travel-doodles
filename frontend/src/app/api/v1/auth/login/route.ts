import { NextRequest, NextResponse } from "next/server";
import { userStore, toSafeUser } from "@/lib/server/userStore";
import { getBackendUrl } from "@/lib/server/backendUrl";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const custom_id = (body.custom_id || body.username || "").trim();
    const device_token = body.device_token || "";

    if (!custom_id) {
      return NextResponse.json(
        { error: "Traveler ID is required to log in." },
        { status: 400 }
      );
    }

    // Proxy to live Go backend if active
    const backendUrl = getBackendUrl();
    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const goRes = await fetch(`${backendUrl}/api/v1/auth/passwordless/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custom_id, device_token }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (goRes.ok) {
          const data = await goRes.json();
          const cookieHeader = goRes.headers.get("set-cookie");
          let sessionToken = data.token || "";
          if (!sessionToken && cookieHeader) {
            const match = cookieHeader.match(/travel_session=([^;]+)/);
            if (match) sessionToken = match[1];
          }

          const response = NextResponse.json({ ...data, token: sessionToken });
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
      } catch (proxyErr) {
        console.warn("Go backend login unreachable, falling back to local store:", proxyErr);
      }
    }

    const user = userStore.findByCustomId(custom_id);
    if (!user) {
      return NextResponse.json(
        { error: "Traveler account not found." },
        { status: 404 }
      );
    }

    const safeUser = toSafeUser(user);
    const sessionToken = userStore.createSession(safeUser.id);
    const response = NextResponse.json({ user: safeUser, token: sessionToken });

    response.cookies.set("travel_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to log in";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
