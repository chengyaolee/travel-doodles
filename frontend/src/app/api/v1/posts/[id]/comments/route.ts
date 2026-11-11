import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const text = body.text || body.content || "";
    const author = body.author || "You (Explorer)";

    if (!text.trim()) {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    if (BACKEND_URL) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/posts/${id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data, { status: 201 });
        }
      } catch {
        // Fallback
      }
    }

    const comment = postsStore.addComment(id, text, author);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid comment payload", details: String(error) }, { status: 400 });
  }
}
