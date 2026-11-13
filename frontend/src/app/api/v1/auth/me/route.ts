import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/server/backendUrl";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const authHeader = req.headers.get("authorization") || "";
  const hasCookie = req.cookies.has("travel_session") || cookieHeader.includes("travel_session=");
  const hasAuth = Boolean(authHeader && authHeader.trim().length > 0);

  // If no credentials exist, return 401 immediately
  if (!hasCookie && !hasAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUser = await resolveAuthUser(req);
  if (authUser) {
    let token = req.cookies?.get?.("travel_session")?.value || "";
    if (!token && cookieHeader) {
      const match = cookieHeader.match(/travel_session=([^;]+)/);
      if (match) token = decodeURIComponent(match[1].trim());
    }
    if (!token && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
    return NextResponse.json({ user: authUser, token });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
