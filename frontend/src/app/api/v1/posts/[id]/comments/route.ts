import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { getBackendUrl, resolveAuthUser } from "@/lib/server/backendUrl";

// GET /api/v1/posts/[id]/comments - Free browsing for everyone
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const backendUrl = getBackendUrl();

  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/v1/posts/${id}/comments`);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback
    }
  }

  const comments = postsStore.getComments(id);
  return NextResponse.json({ comments });
}

// POST /api/v1/posts/[id]/comments - Only interactions require an account
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const backendUrl = getBackendUrl();

  try {
    const body = await request.json();
    const text = body.text || body.content || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    if (backendUrl) {
      let res: Response;
      try {
        res = await fetch(`${backendUrl}/api/v1/posts/${id}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
            ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
          },
          body: JSON.stringify({ content: text }),
        });
      } catch (proxyErr) {
        console.error("Go backend unreachable for POST /comments:", proxyErr);
        return NextResponse.json(
          { error: "Backend server is unreachable. Please try again later." },
          { status: 502 }
        );
      }

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201 });
      } else {
        const errorData = await res.json().catch(() => ({ error: `Backend error: ${res.statusText}` }));
        return NextResponse.json(errorData, { status: res.status });
      }
    }

    const authUser = await resolveAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to leave a comment. Please log in or create an account." },
        { status: 401 }
      );
    }

    const author = authUser.display_name || authUser.custom_id || authUser.username;
    const comment = postsStore.addComment(id, text, author);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid comment payload", details: String(error) }, { status: 400 });
  }
}
