"use client";

import { useState, useEffect } from "react";
import { DoodlePin, DoodleStar, DoodleUnderline } from "@/components/doodles";
import { TravelDoodlePost } from "./CreatePostModal";

interface FeedPost extends TravelDoodlePost {
  commentsList: { user: string; text: string; time: string }[];
}

export function SocialFeedModal({
  isOpen,
  onClose,
  extraPosts = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  extraPosts?: TravelDoodlePost[];
}) {
  const [feed, setFeed] = useState<FeedPost[]>(() =>
    extraPosts.map((p) => ({ ...p, commentsList: [] }))
  );
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setFeed(extraPosts.map((p) => ({ ...p, commentsList: [] })));
  }, [extraPosts]);

  if (!isOpen) return null;

  const handleLike = (id: string) => {
    const isLiked = !!likedPosts[id];
    setLikedPosts((prev) => ({ ...prev, [id]: !isLiked }));
    setFeed((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, likes: isLiked ? post.likes - 1 : post.likes + 1 } : post
      )
    );
  };

  const handleAddComment = (id: string) => {
    const text = commentInputs[id]?.trim();
    if (!text) return;

    setFeed((prev) =>
      prev.map((post) =>
        post.id === id
          ? {
              ...post,
              commentsList: [
                ...post.commentsList,
                { user: "You", text, time: "Just now" },
              ],
            }
          : post
      )
    );
    setCommentInputs((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl my-8 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-primary)] z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📸</span>
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
            className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Feed List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-[var(--bg-secondary)]">
          {feed.length === 0 ? (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-3xl mb-4 shadow-sm">
                📬
              </div>
              <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                The Travel Wire is Quiet
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] max-w-sm mt-1.5 font-sans leading-relaxed">
                No stories shared yet. Pin your memories from the homepage or Explore Atlas to start the conversation!
              </p>
            </div>
          ) : (
            feed.map((post) => {
              const isLiked = likedPosts[post.id];
              return (
                <article
                  key={post.id}
                  className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden"
                >
                  {/* Author Bar */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={post.avatar}
                        alt={post.author}
                        className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-[var(--ink-primary)]">
                          {post.author}
                        </h4>
                        <p className="text-xs text-[var(--ink-secondary)] font-mono">
                          {post.date} · #{post.visibility}
                        </p>
                      </div>
                    </div>
                    <button className="text-xs font-hand px-3 py-1 rounded-full border border-[var(--border-color)] hover:border-[var(--ink-primary)] text-[var(--ink-secondary)]">
                      + Follow
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

                {/* Post Body & Hand-drawn Caption */}
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
                        <span className={isLiked ? "scale-125 transition-transform" : ""}>
                          {isLiked ? "❤️" : "🤍"}
                        </span>
                        <span className="font-bold">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer">
                        <span>💬</span>
                        <span>{post.commentsList.length}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer">
                        <span>↗</span>
                        <span>Share</span>
                      </button>
                    </div>

                    <span className="text-[10px] font-hand text-[var(--ink-secondary)]">
                      Doodled memory
                    </span>
                  </div>

                  {/* Comments Section */}
                  {post.commentsList.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-color)] space-y-2">
                      {post.commentsList.map((c, idx) => (
                        <div key={idx} className="text-xs flex items-start gap-2 bg-[var(--bg-secondary)] p-2 rounded-lg">
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

                  {/* Add Comment Input */}
                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a travel note or question..."
                      value={commentInputs[post.id] || ""}
                      onChange={(e) =>
                        setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment(post.id);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="px-3 py-1.5 text-xs font-hand font-bold bg-[var(--ink-primary)] text-[var(--bg-primary)] rounded-xl hover:opacity-90"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </article>
            );
          }))}
        </div>
      </div>
    </div>
  );
}
