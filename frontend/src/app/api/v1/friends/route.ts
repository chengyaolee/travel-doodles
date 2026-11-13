import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

export async function GET(req: NextRequest) {
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    try {
      const res = await fetch(`${getTargetBackendUrl()}/api/v1/friends`, {
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

  const friends = userStore.listFriends(authUser.id);
  return NextResponse.json({ friends, count: friends.length });
}
