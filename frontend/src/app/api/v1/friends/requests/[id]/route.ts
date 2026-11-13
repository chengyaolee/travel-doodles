import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

// DELETE /api/v1/friends/requests/[id] - Cancel outgoing friend request
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    let res: Response;
    try {
      res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/requests/${id}`, {
        method: "DELETE",
        headers: {
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
      });
    } catch (proxyErr) {
      console.error("Go backend unreachable for cancel friend request:", proxyErr);
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = userStore.cancelFriendRequest(authUser.id, id);
    return NextResponse.json({
      message: "Friend request cancelled.",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel friend request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
