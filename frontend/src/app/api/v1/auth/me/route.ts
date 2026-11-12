import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function GET(req: NextRequest) {
  const hasCookie = req.cookies.has("travel_session");
  const hasAuth = req.headers.has("authorization");

  // 1. Instant check: If no credentials exist, return 401 in 0ms (no backend wait)
  if (!hasCookie && !hasAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Instant check: If authenticated in local server store, return in 0ms (no lag)
  const localUser = userStore.getAuthUser(req);
  if (localUser) {
    return NextResponse.json({ user: localUser });
  }

  // 3. Fallback: Check live Go backend if active (with fast 1.5s timeout)
  if (BACKEND_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const goRes = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: {
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (goRes.ok) {
        const data = await goRes.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend unreachable or timed out
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
