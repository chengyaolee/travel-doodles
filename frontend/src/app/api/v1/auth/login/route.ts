import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const custom_id = (body.custom_id || body.username || "").trim();
    const password = body.password || "";
    const device_token = body.device_token || "";

    if (!custom_id) {
      return NextResponse.json(
        { error: "Traveler ID is required to log in." },
        { status: 400 }
      );
    }

    // Proxy to live Go backend if active
    if (BACKEND_URL) {
      try {
        const goRes = await fetch(`${BACKEND_URL}/api/v1/auth/passwordless/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ custom_id, device_token }),
        });
        if (goRes.ok) {
          const data = await goRes.json();
          const cookieHeader = goRes.headers.get("set-cookie");
          const response = NextResponse.json(data);
          if (cookieHeader) response.headers.set("set-cookie", cookieHeader);
          return response;
        }
      } catch {
        // Fallback to local server store
      }
    }

    const safeUser = userStore.verifyCredentials(custom_id, password);
    if (!safeUser) {
      return NextResponse.json(
        { error: "Invalid Traveler ID or credentials." },
        { status: 401 }
      );
    }

    const sessionToken = userStore.createSession(safeUser.id);
    const response = NextResponse.json({ user: safeUser });

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
