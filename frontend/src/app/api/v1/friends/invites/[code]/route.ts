import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

// GET /api/v1/friends/invites/[code] - Inspect friend invite details and TTL validity
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const authUser = userStore.getAuthUser(req);

  if (getTargetBackendUrl()) {
    try {
      const res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/invites/${code}`, {
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

  try {
    const data = userStore.getFriendInvite(code, authUser?.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Friend invite link not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
