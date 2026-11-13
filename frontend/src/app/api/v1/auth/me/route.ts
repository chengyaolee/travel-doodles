import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUser } from "@/lib/server/backendUrl";

export async function GET(req: NextRequest) {
  const hasCookie = req.cookies.has("travel_session");
  const hasAuth = req.headers.has("authorization");

  // If no credentials exist, return 401 immediately
  if (!hasCookie && !hasAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUser = await resolveAuthUser(req);
  if (authUser) {
    const token =
      req.cookies.get("travel_session")?.value ||
      (req.headers.get("authorization")?.startsWith("Bearer ")
        ? req.headers.get("authorization")!.slice(7).trim()
        : "");
    return NextResponse.json({ user: authUser, token });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
