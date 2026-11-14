import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { getBackendUrl, resolveAuthUser } from "@/lib/server/backendUrl";

export const POST = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  handleLike(request, context, "POST");

// DELETE unlikes on the Go backend; the local store's toggle covers both directions.
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
  handleLike(request, context, "DELETE");

async function handleLike(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  method: "POST" | "DELETE"
) {
  const { id } = await context.params;
  const backendUrl = getBackendUrl();

  if (backendUrl) {
    let res: Response;
    try {
      res = await fetch(`${backendUrl}/api/v1/posts/${id}/likes`, {
        method,
        headers: {
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
          ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
        },
      });
    } catch (proxyErr) {
      console.error(`Go backend unreachable for ${method} /likes:`, proxyErr);
      return NextResponse.json(
        { error: "Backend server is unreachable. Please try again later." },
        { status: 502 }
      );
    }

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const errorData = await res.json().catch(() => ({ error: `Backend error: ${res.statusText}` }));
      return NextResponse.json(errorData, { status: res.status });
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
