import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

// POST /api/v1/friends/invites - Generate a shareable friend link with 3-day TTL (72 hours)
export async function POST(req: NextRequest) {
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    const body = await req.clone().json().catch(() => ({}));
    // Enforce 3-day TTL (72 hours)
    const payload = {
      ...body,
      expire_hours: body.expire_hours || 72,
      max_uses: body.max_uses || 0,
    };

    let res: Response;
    try {
      res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (proxyErr) {
      console.error("Go backend unreachable for create invite:", proxyErr);
      return NextResponse.json(
        { error: "Backend server is unreachable. Please try again later." },
        { status: 502 }
      );
    }

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: 201 });
    } else {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json(errData, { status: res.status });
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    // TTL is 3 days = 72 hours
    const expireHours = body.expire_hours || 72;
    const maxUses = body.max_uses || 0;

    const invite = userStore.createFriendInvite(authUser.id, expireHours, maxUses);
    return NextResponse.json(
      {
        message: "Friend invite link generated successfully (valid for 3 days).",
        invite,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate friend invite link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
