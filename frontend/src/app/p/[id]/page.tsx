import { cache } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { normalizePost } from "@/lib/api";
import { postsStore } from "@/lib/server/postsStore";
import { getBackendUrl } from "@/lib/server/backendUrl";
import { Brand } from "@/components/layout/Brand";
import { InkIcon } from "@/components/ui/InkIcon";
import { PaperGrainOverlay } from "@/components/explore/PaperGrainOverlay";
import { PostView } from "./PostView";

type Props = { params: Promise<{ id: string }> };

// cache() dedupes the lookup between generateMetadata and the page render.
const getPost = cache(async (id: string) => {
  const backendUrl = getBackendUrl();
  if (backendUrl) {
    // Forward the session cookie so friends-only posts resolve for the viewer.
    const cookie = (await cookies()).toString();
    try {
      const res = await fetch(`${backendUrl}/api/v1/posts/${encodeURIComponent(id)}`, {
        headers: cookie ? { cookie } : {},
        cache: "no-store",
      });
      if (!res.ok) return null;
      const { post } = await res.json();
      return post ? { post: normalizePost(post), hasLiked: Boolean(post.has_liked) } : null;
    } catch {
      return null;
    }
  }
  const raw = postsStore.getPostById(id);
  return raw ? { post: normalizePost(raw), hasLiked: Boolean((raw as { _userLiked?: boolean })._userLiked) } : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPost((await params).id);
  if (!data) return { title: "Story not found — Travel Doodles" };
  const { post } = data;
  const place = post.location || post.city || "somewhere in the world";
  const title = `${post.author} in ${place} — Travel Doodles`;
  const description = post.caption || `A travel doodle from ${place}.`;
  const images = post.image?.startsWith("http") ? [post.image] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: "article", images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
  };
}

export default async function PostPage({ params }: Props) {
  const data = await getPost((await params).id);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--ink-primary)] relative selection:bg-[#d94e34]/20">
      <PaperGrainOverlay />
      <header className="sticky top-0 z-20 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 backdrop-blur">
        <Brand />
        <Link
          href="/explore"
          className="text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors flex items-center gap-1.5"
        >
          <InkIcon name="globe" size={15} />
          <span>Explore Atlas</span>
        </Link>
      </header>

      <main id="main-content" className="relative z-10">
        {data ? (
          <PostView post={data.post} initialLiked={data.hasLiked} />
        ) : (
          <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
            <span className="inline-flex text-[#d94e34]"><InkIcon name="pin" size={36} /></span>
            <h1 className="font-hand text-4xl font-bold">This story wandered off.</h1>
            <p className="text-sm text-[var(--ink-secondary)]">
              It may have been removed, or it’s only shared with the author’s friends.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Explore the atlas <InkIcon name="arrow" size={15} />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
