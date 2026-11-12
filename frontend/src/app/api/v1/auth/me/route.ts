import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function GET(req: NextRequest) {
  // Proxy to live Go backend if active (with 3.5s timeout)
  if (BACKEND_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
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
      // Fallback to local server store
    }
  }

  const user = userStore.getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
