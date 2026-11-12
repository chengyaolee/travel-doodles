import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const authUser = userStore.getAuthUser(request);

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/posts/${id}/likes`, {
        method: "POST",
        headers: {
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
          ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      } else if (res.status === 401) {
        return NextResponse.json(
          { error: "Authentication required to like a memory. Please log in or create an account." },
          { status: 401 }
        );
      }
    } catch {
      // Fallback
    }
  }

  if (!authUser) {
    return NextResponse.json(
      { error: "Authentication required to like a memory. Please log in or create an account." },
      { status: 401 }
    );
  }

  const result = postsStore.toggleLike(id);
  return NextResponse.json(result);
}
