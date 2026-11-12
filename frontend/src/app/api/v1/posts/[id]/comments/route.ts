import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";
import { userStore } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

// GET /api/v1/posts/[id]/comments - Free browsing for everyone
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/posts/${id}/comments`);
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
  const authUser = userStore.getAuthUser(request);

  try {
    const body = await request.json();
    const text = body.text || body.content || "";

    if (!text.trim()) {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    if (BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/posts/${id}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
            ...(request.headers.get("authorization") ? { authorization: request.headers.get("authorization")! } : {}),
          },
          body: JSON.stringify({ content: text }),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: 201 });
        } else if (res.status === 401) {
          return NextResponse.json(
            { error: "Authentication required to leave a comment. Please log in or create an account." },
            { status: 401 }
          );
        }
      } catch {
        // Fallback
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to leave a comment. Please log in or create an account." },
        { status: 401 }
      );
    }

    const author = authUser.display_name || authUser.username;
    const comment = postsStore.addComment(id, text, author);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid comment payload", details: String(error) }, { status: 400 });
  }
}
