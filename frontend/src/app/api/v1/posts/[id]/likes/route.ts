import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { getBackendUrl, resolveAuthUser } from "@/lib/server/backendUrl";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const backendUrl = getBackendUrl();

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/v1/posts/${id}/likes`, {
        method: "POST",
        headers: {
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
          ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      } else if (res.status !== 401) {
        const errorData = await res.json().catch(() => ({ error: `Backend error: ${res.statusText}` }));
        return NextResponse.json(errorData, { status: res.status });
      }
    } catch {
      // Fallback
    }
  }

  const authUser = await resolveAuthUser(request);
  if (!authUser) {
    return NextResponse.json(
      { error: "Authentication required to like a memory. Please log in or create an account." },
      { status: 401 }
    );
  }

  const result = postsStore.toggleLike(id);
  return NextResponse.json(result);
}
