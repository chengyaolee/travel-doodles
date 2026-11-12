import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("travel_session")?.value;
  if (token) {
    userStore.revokeSession(token);
  }

  if (BACKEND_URL) {
    try {
      await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
        },
      });
    } catch {
      // ignore
    }
  }

  const response = NextResponse.json({ message: "Logged out successfully" });
  response.cookies.set("travel_session", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
