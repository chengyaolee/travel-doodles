import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function PATCH(req: NextRequest) {
  const authUser = userStore.getAuthUser(req);

  // If live Go backend is configured, proxy request
  if (BACKEND_URL) {
    try {
      const body = await req.clone().json();
      const res = await fetch(`${BACKEND_URL}/api/v1/users/custom-id`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(req.headers.get("cookie") ? { cookie: req.headers.get("cookie")! } : {}),
          ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        },
        body: JSON.stringify(body),
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
    const body = await req.json();
    const newCustomId = (body.custom_id || "").trim();

    if (!newCustomId) {
      return NextResponse.json({ error: "New handle is required." }, { status: 400 });
    }

    const updated = userStore.updateCustomId(authUser.id, newCustomId);
    return NextResponse.json({
      message: "Handle updated successfully",
      custom_id: updated.custom_id,
      user: updated,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update handle";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
