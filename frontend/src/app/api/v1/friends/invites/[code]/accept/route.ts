import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

// POST /api/v1/friends/invites/[code]/accept - Receiver confirms friend invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    let res: Response;
    try {
      res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/invites/${code}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
      });
    } catch (proxyErr) {
      console.error("Go backend unreachable for accept invite:", proxyErr);
      return NextResponse.json(
        { error: "Backend server is unreachable. Please try again later." },
        { status: 502 }
      );
    }

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(errData, { status: res.status });
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
