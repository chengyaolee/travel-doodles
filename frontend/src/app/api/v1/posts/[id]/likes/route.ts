import { NextRequest, NextResponse } from "next/server";
import { postsStore } from "@/lib/server/postsStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/posts/${id}/likes`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback
    }
  }

  const result = postsStore.toggleLike(id);
  return NextResponse.json(result);
}
