import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

import { getBackendUrl } from "@/lib/server/backendUrl";
const getTargetBackendUrl = () => getBackendUrl();

export async function GET(req: NextRequest) {
  const authUser = userStore.getAuthUser(req);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (getTargetBackendUrl()) {
    try {
      const res = await fetch(`${getTargetBackendUrl()}/api/v1/friends/search?q=${encodeURIComponent(q)}`, {
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

  const results = userStore.searchUsers(q, authUser?.id);
  return NextResponse.json({ users: results });
}
