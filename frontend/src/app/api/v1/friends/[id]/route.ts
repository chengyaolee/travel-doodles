import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    let res: Response;
    try {
      res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/${id}`, {
        method: "DELETE",
        headers: {
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
      });
    } catch (proxyErr) {
      console.error("Go backend unreachable for remove friend:", proxyErr);
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

  userStore.removeFriend(authUser.id, id);
  return NextResponse.json({ message: "Friend removed successfully" });
}
