import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

// GET /api/v1/friends/requests - List incoming and outgoing friend requests
export async function GET(req: NextRequest) {
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    try {
      const res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/requests`, {
        headers: {
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback
    }
  }

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = userStore.listFriendRequests(authUser.id);
  return NextResponse.json(data);
}

// POST /api/v1/friends/requests - Send a friend request by ID or custom handle
export async function POST(req: NextRequest) {
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    try {
      const body = await req.clone().json();
      const res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201 });
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
    const body = await req.json();
    const target = body.custom_id || body.target_id || "";
    if (!target) {
      return NextResponse.json(
        { error: "Traveler ID or handle is required to send a friend request." },
        { status: 400 }
      );
    }

    const result = userStore.sendFriendRequest(authUser.id, target);
    return NextResponse.json(
      {
        message: `Friend request sent to @${result.target.custom_id}!`,
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send friend request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
