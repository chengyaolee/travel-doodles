"use client";

import React from "react";
import { ExplorePost } from "@/lib/explore/mockPosts";

interface PhotoPeekProps {
  post: ExplorePost;
  onOpenPost: (postId: string) => void;
  onClose: () => void;
}

export function PhotoPeek({ post, onOpenPost, onClose }: PhotoPeekProps) {
  return (
    <div
      role="dialog"
      aria-label={`Story preview for ${post.location}`}
      className="w-64 p-3 rounded-xl bg-[var(--bg-primary)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-2xl animate-in fade-in zoom-in-95 duration-200 select-none text-left"
    >
      {/* Header: Author + Close */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.avatar}
            alt={post.author}
            className="w-6 h-6 rounded-full object-cover border border-[var(--border-color)]"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[var(--ink-primary)] leading-none">
              {post.author}
            </span>
            <span className="text-[10px] text-[var(--ink-secondary)]">
              {post.city}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-full text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
          aria-label="Close preview"
        >
          ✕
        </button>
      </div>

      {/* Photo Preview if not text-only */}
      {post.image && !post.isTextOnly && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2 bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image}
            alt={post.caption}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
          {post.doodleSticker && (
            <span className="absolute bottom-1.5 right-1.5 text-lg drop-shadow-md select-none">
              {post.doodleSticker}
            </span>
          )}
        </div>
      )}

      {/* Caption snippet */}
      <p className="text-xs text-[var(--ink-primary)] line-clamp-2 leading-snug mb-3">
        {post.caption}
      </p>

      {/* Action: Open post */}
      <button
        onClick={() => onOpenPost(post.id)}
        className="w-full py-1.5 px-3 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
      >
        <span>Open post</span>
        <span>→</span>
      </button>
    </div>
  );
}
