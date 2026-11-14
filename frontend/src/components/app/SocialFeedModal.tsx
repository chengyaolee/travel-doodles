"use client";

import { useMobileModalBack } from "@/lib/useMobileModalBack";
import { useState, useEffect } from "react";
import { DoodlePin } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { TravelDoodlePost } from "./CreatePostModal";
import { useAuth } from "@/lib/authContext";
import { api } from "@/lib/api";

interface FeedPost extends TravelDoodlePost {
  commentsList: { user: string; text: string; time: string }[];
}

export function SocialFeedModal({
  isOpen,
  onClose,
  extraPosts = [],
  onViewProfile,
}: {
  isOpen: boolean;
  onClose: () => void;
  extraPosts?: TravelDoodlePost[];
  onViewProfile?: (username: string) => void;
}) {
  const [feed, setFeed] = useState<FeedPost[]>(() =>
    extraPosts.map((p) => ({ ...p, commentsList: [] }))
  );
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [shareToast, setShareToast] = useState<string | null>(null);
  const { user, requireAuth } = useAuth();

  useEffect(() => {
    setFeed(extraPosts.map((p) => ({ ...p, commentsList: [] })));
  }, [extraPosts]);

  useMobileModalBack(isOpen, onClose);

  if (!isOpen) return null;

  const handleLike = (id: string) => {
    requireAuth("like this memory", () => {
      const isLiked = !!likedPosts[id];
      setLikedPosts((prev) => ({ ...prev, [id]: !isLiked }));
      setFeed((prev) =>
        prev.map((post) =>
          post.id === id ? { ...post, likes: isLiked ? post.likes - 1 : post.likes + 1 } : post
        )
      );
      api.toggleLike(id).catch((e) => console.warn("Like sync notice:", e));
    });
  };

  const handleAddComment = (id: string) => {
    const text = commentInputs[id]?.trim();
    if (!text) return;

    requireAuth("leave a comment", () => {
      const author = user?.display_name || user?.username || "You";
      setFeed((prev) =>
        prev.map((post) =>
          post.id === id
            ? {
                ...post,
                commentsList: [
                  ...post.commentsList,
                  { user: author, text, time: "Just now" },
                ],
              }
            : post
        )
      );
      setCommentInputs((prev) => ({ ...prev, [id]: "" }));
      api.addComment(id, text).catch((e) => console.warn("Comment sync notice:", e));
    });
  };

  const handleShare = (post: FeedPost) => {
    const url = `${window.location.origin}/p/${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setShareToast("Story link copied to clipboard!");
    setTimeout(() => setShareToast(null), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="relative w-full max-w-2xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl my-8 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Share Toast */}
        {shareToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-semibold shadow-xl border border-[var(--border-color)]">
            {shareToast}
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)] z-10">
          <div className="flex items-center gap-3">
            <span className="text-[var(--accent)]">
              <InkIcon name="photo" size={24} />
            </span>
            <div>
              <h2 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                Travel Community Stories
              </h2>
              <p className="text-xs text-[var(--ink-secondary)] font-mono">
                Fresh travel doodles from friends and creators worldwide
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] cursor-pointer"
          >
            <InkIcon name="close" size={16} />
          </button>
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {feed.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <DoodlePin size={40} filled className="mb-3 text-[var(--ink-primary)] animate-bounce" />
              <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                The community feed is clean
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] max-w-sm mt-1.5 font-sans leading-relaxed">
                No travel memories have been shared yet. Start doodling your memories to pin the first story!
              </p>
            </div>
          ) : (
            feed.map((post) => {
              const isLiked = !!likedPosts[post.id];

              return (
                <div
                  key={post.id}
                  className="bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Author Header */}
                  <div className="p-4 flex items-center justify-between border-b border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => onViewProfile?.(post.author)}
                      className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer group"
                    >
                      <AnonymousAvatar
                        avatarUrl={post.avatar}
                        name={post.author}
                        size={40}
                        className="border border-[var(--border-color)]"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-[var(--ink-primary)] group-hover:underline">
                          {post.author}
                        </h4>
                        <p className="text-xs text-[var(--ink-secondary)] font-mono">
                          {post.date} · #{post.visibility}
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Main Photo (Photo-first) or Location tag */}
                  {post.image ? (
                    <div className="aspect-[16/11] bg-neutral-100 overflow-hidden relative">
                      <img
                        src={post.image}
                        alt={post.city}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white font-hand text-xs flex items-center gap-1">
                        <DoodlePin size={12} color="#fff" filled />
                        <span>{post.location}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 pt-3 pb-1 flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] font-bold">
                      <DoodlePin size={14} filled />
                      <span>{post.location}</span>
                    </div>
                  )}

                  {/* Post Body & Caption */}
                  <div className="p-5">
                    <p className="font-hand text-base sm:text-lg text-[var(--ink-primary)] leading-relaxed mb-4">
                      &ldquo;{post.caption}&rdquo;
                    </p>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                        >
                          <span className={isLiked ? "text-red-500" : ""}>
                            <InkIcon
                              name="heart"
                              size={15}
                              fill={isLiked ? "currentColor" : "none"}
                            />
                          </span>
                          <span className="font-bold">{post.likes}</span>
                        </button>
                        <button
                          onClick={() => {
                            requireAuth("leave a comment");
                          }}
                          className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                        >
                          <span>
                            <InkIcon name="comment" size={15} />
                          </span>
                          <span>{post.commentsList.length}</span>
                        </button>
                        <button
                          onClick={() => handleShare(post)}
                          className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                        >
                          <span>↗</span>
                          <span>Share</span>
                        </button>
                      </div>

                      <span className="text-[10px] font-hand text-[var(--ink-secondary)]">
                        Doodled memory
                      </span>
                    </div>

                    {/* Comments List */}
                    {post.commentsList.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] space-y-2">
                        {post.commentsList.map((c, idx) => (
                          <div
                            key={idx}
                            className="text-xs flex items-start gap-2 bg-[var(--bg-primary)] p-2 rounded-lg border border-[var(--border-color)]"
                          >
                            <span className="font-bold text-[var(--ink-primary)] shrink-0">
                              {c.user}:
                            </span>
                            <span className="text-[var(--ink-secondary)] flex-1">{c.text}</span>
                            <span className="text-[10px] text-[var(--ink-secondary)] font-mono shrink-0">
                              {c.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment Input */}
                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddComment(post.id);
                        }}
                        placeholder="Write a little note or reflection..."
                        className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--ink-primary)]"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="px-3 py-1.5 bg-[var(--ink-primary)] text-[var(--bg-primary)] rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
