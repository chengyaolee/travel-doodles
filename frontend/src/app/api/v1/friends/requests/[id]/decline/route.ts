import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

// POST /api/v1/friends/requests/[id]/decline
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = userStore.getAuthUser(req);

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/friends/requests/${id}/decline`, {
        method: "POST",
        headers: {
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        return NextResponse.json(errData, { status: res.status });
      }
    } catch {
      // Fallback
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = userStore.declineFriendRequest(authUser.id, id);
    return NextResponse.json({
      message: "Friend request declined.",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to decline friend request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
