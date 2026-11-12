import { NextRequest, NextResponse } from "next/server";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function POST(req: NextRequest) {
  const authUser = userStore.getAuthUser(req);

  if (BACKEND_URL) {
    try {
      const body = await req.clone().json();
      const res = await fetch(`${BACKEND_URL}/api/v1/friends/add`, {
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
    const targetCustomId = (body.custom_id || "").replace(/^@/, "").trim();

    if (!targetCustomId) {
      return NextResponse.json(
        { error: "Traveler handle is required to add as a friend." },
        { status: 400 }
      );
    }

    const friend = userStore.addFriend(authUser.id, targetCustomId);
    return NextResponse.json({
      message: "Friend added successfully",
      friend,
    }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to add friend";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
