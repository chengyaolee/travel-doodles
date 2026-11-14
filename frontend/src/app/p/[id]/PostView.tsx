"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getAuthHeaders } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import type { ExplorePost } from "@/lib/explore/mockPosts";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { InkIcon } from "@/components/ui/InkIcon";

interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: string;
}

// Comments arrive either from the Go backend ({ author: {...}, content, created_at })
// or the local store ({ author: "name", text, createdAt }).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toComment(c: any): Comment {
  const author = typeof c.author === "string" ? c.author : c.author?.display_name || c.author?.username || "Traveler";
  return {
    id: String(c.id),
    author,
    avatar: c.avatar || c.author?.avatar_url || "",
    text: c.text ?? c.content ?? "",
    createdAt: c.createdAt || c.created_at || new Date().toISOString(),
  };
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function timeAgo(iso: string) {
  const mins = Math.round((Date.parse(iso) - Date.now()) / 60000);
  if (Number.isNaN(mins)) return "";
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  if (Math.abs(mins) < 1440) return rtf.format(Math.round(mins / 60), "hour");
  if (Math.abs(mins) < 43200) return rtf.format(Math.round(mins / 1440), "day");
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PostView({ post, initialLiked }: { post: ExplorePost; initialLiked: boolean }) {
  const { user, requireAuth } = useAuth();
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.getComments(post.id).then((list) => setComments(list.map(toComment)), () => setComments([]));
  }, [post.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const place = post.location || [post.city, post.country].filter(Boolean).join(", ");
  const date = new Date(`${post.date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const mapHref = `/explore?country=${post.country}${post.region ? `&region=${post.region}` : ""}&post=${post.id}`;
  const commentCount = comments ? Math.max(comments.length, post.comments) : post.comments;

  const toggleLike = () =>
    requireAuth("like this memory", async () => {
      const next = !liked;
      setLiked(next);
      setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
      // Backend: POST likes, DELETE unlikes.
      const res = await fetch(`/api/v1/posts/${post.id}/likes`, {
        method: next ? "POST" : "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      }).catch(() => null);
      if (!res?.ok) {
        setLiked(!next);
        setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
        setToast("Couldn’t save that like. Please try again.");
      }
    });

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    requireAuth("leave a comment", async () => {
      setSending(true);
      try {
        const saved = toComment(await api.addComment(post.id, text));
        setComments((prev) => [...(prev ?? []), { ...saved, author: saved.author === "Traveler" && user ? user.display_name || user.custom_id : saved.author }]);
        setDraft("");
      } catch (err) {
        setToast(err instanceof Error ? err.message : "Couldn’t post your note.");
      } finally {
        setSending(false);
      }
    });
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${post.author} in ${place}`, text: post.caption, url });
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }
    navigator.clipboard?.writeText(url).then(
      () => setToast("Link copied — send it to someone"),
      () => setToast(url)
    );
  };

  return (
    <article className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 grid grid-cols-1 gap-10 md:gap-14 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-semibold shadow-xl">
          {toast}
        </div>
      )}

      {/* The doodle itself, pinned to the page like a polaroid */}
      <figure className="md:sticky md:top-24 mx-auto w-full max-w-lg">
        <div className="relative bg-white p-3 sm:p-4 pb-14 sm:pb-16 rounded-sm shadow-[var(--shadow-photo)] border border-neutral-200 -rotate-[1.5deg] transition-transform duration-500 hover:rotate-0">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-stone-200/90 rotate-2 shadow-2xs" aria-hidden="true" />
          {post.image && !post.isTextOnly ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image} alt={post.caption || `Travel doodle from ${place}`} className="w-full aspect-[4/5] sm:aspect-[4/3.4] object-cover bg-neutral-100" />
          ) : (
            <div className="w-full aspect-square bg-[#fbf8f1] flex items-center justify-center p-8">
              <p className="font-hand text-3xl sm:text-4xl leading-snug text-[#2a2a2a] text-center">“{post.caption}”</p>
            </div>
          )}
          <figcaption className="absolute bottom-3 sm:bottom-4 left-4 right-4 flex items-center justify-between gap-3 font-hand text-[#333]">
            <span className="text-xl sm:text-2xl truncate">{post.city || place}</span>
            <span className="text-base sm:text-lg text-[#777] shrink-0">{date}</span>
          </figcaption>
        </div>
      </figure>

      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <AnonymousAvatar avatarUrl={post.avatar} name={post.author} size={48} className="border border-[var(--border-color)] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{post.author}</p>
            {post.authorCustomId && <p className="text-xs text-[var(--ink-secondary)] font-mono truncate">@{post.authorCustomId}</p>}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--ink-secondary)] border border-[var(--border-color)] rounded-full px-2.5 py-1">
            {post.visibility === "friends" ? "Friends" : "Everyone"}
          </span>
        </div>

        <Link href={mapHref} className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#d94e34]/10 text-[#d94e34] px-3.5 py-1.5 text-sm font-semibold hover:bg-[#d94e34]/15 transition-colors">
          <InkIcon name="pin" size={16} />
          <span>{place}</span>
          <InkIcon name="arrow" size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>

        {post.caption && !(post.isTextOnly || !post.image) && (
          <p className="mt-5 text-xl sm:text-2xl leading-relaxed text-pretty whitespace-pre-line">{post.caption}</p>
        )}

        <p className="mt-5 text-xs text-[var(--ink-secondary)]">
          <time dateTime={post.date}>{date}</time>
          {post.coordinates[0] !== 0 && <> · {post.coordinates[1].toFixed(3)}°, {post.coordinates[0].toFixed(3)}°</>}
        </p>

        <div className="mt-5 flex items-center gap-1 border-y border-[var(--border-color)] py-2">
          <button onClick={toggleLike} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-[var(--bg-elevated)] ${liked ? "text-[#d94e34]" : ""}`}>
            <InkIcon name="heart" size={20} fill={liked ? "currentColor" : "none"} className={liked ? "scale-110 transition-transform" : "transition-transform"} />
            <span>{likes}</span>
          </button>
          <a href="#comments" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--bg-elevated)] transition-colors">
            <InkIcon name="comment" size={19} />
            <span>{commentCount}</span>
          </a>
          <button onClick={share} className="ml-auto flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--bg-elevated)] transition-colors">
            <InkIcon name="share" size={17} />
            <span>Share</span>
          </button>
        </div>

        <section id="comments" aria-label="Comments" className="mt-8 scroll-mt-24">
          <h2 className="font-hand text-3xl font-bold">Notes left here</h2>

          <form onSubmit={submitComment} className="mt-4 flex items-start gap-3">
            <AnonymousAvatar avatarUrl={user?.avatar_url} name={user?.display_name} size={36} className="border border-[var(--border-color)] shrink-0 mt-0.5" />
            <div className="flex-1 flex gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-1.5 focus-within:border-[var(--ink-secondary)] transition-colors">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={500}
                aria-label="Your comment"
                placeholder={user ? "Leave a little note…" : "Log in to leave a note…"}
                className="flex-1 min-w-0 bg-transparent px-2.5 text-sm outline-none"
              />
              <button type="submit" disabled={!draft.trim() || sending} className="px-4 py-2 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-bold disabled:opacity-40 transition-opacity">
                {sending ? "Posting…" : "Post"}
              </button>
            </div>
          </form>

          <ul className="mt-6 space-y-5">
            {comments === null && <li className="h-12 rounded-xl bg-[var(--bg-elevated)] animate-pulse" aria-busy="true" />}
            {comments?.length === 0 && (
              <li className="text-sm text-[var(--ink-secondary)] py-4">
                No notes yet. <span className="font-hand text-lg">be the first to say hi.</span>
              </li>
            )}
            {comments?.map((c) => (
              <li key={c.id} className="flex gap-3">
                <AnonymousAvatar avatarUrl={c.avatar} name={c.author} size={36} className="border border-[var(--border-color)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{c.author}</span>
                    <span className="ml-2 text-xs text-[var(--ink-secondary)]">{timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-line">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
