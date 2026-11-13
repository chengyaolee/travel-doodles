import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

// POST /api/v1/friends/invites/[code]/accept - Receiver confirms friend invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const authUser = userStore.getAuthUser(req);

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/friends/invites/${code}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    return NextResponse.json(
      { error: "Please log in or create an account to accept this friend invite." },
      { status: 401 }
    );
  }

  try {
    const result = userStore.acceptFriendInvite(authUser.id, code);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept friend invite";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
