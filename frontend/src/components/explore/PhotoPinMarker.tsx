"use client";

import React from "react";
import { ExplorePost } from "@/lib/explore/mockPosts";

interface PhotoPinMarkerProps {
  post: ExplorePost;
  isSelected: boolean;
  onClick: () => void;
  count?: number;
}

export function PhotoPinMarker({ post, isSelected, onClick, count }: PhotoPinMarkerProps) {
  // If text only, render a fine sketchbook point dot
  if (post.isTextOnly || !post.image) {
    return (
      <button
        onClick={onClick}
        className={`group relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 cursor-pointer ${
          isSelected
            ? "scale-125 ring-2 ring-[var(--ink-primary)] ring-offset-2 ring-offset-[var(--bg-primary)] bg-[var(--ink-primary)] text-[var(--bg-primary)] shadow-md"
            : "bg-[var(--bg-primary)] text-[var(--ink-primary)] border border-[var(--border-color)] hover:scale-115 shadow-sm"
        }`}
        title={`${post.author} in ${post.city}`}
        aria-label={`Story by ${post.author} in ${post.city}`}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <span className="sr-only">{post.caption}</span>
      </button>
    );
  }

  // Polaroid-style photo pin with bottom-right badge (no emojis)
  return (
    <button
      onClick={onClick}
      className={`group relative p-1 rounded-md bg-white dark:bg-[#25252b] border border-stone-300 dark:border-stone-700 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer select-none hover:scale-110 ${
        isSelected
          ? "scale-115 ring-2 ring-[var(--ink-primary)] ring-offset-2 ring-offset-[var(--bg-primary)] z-30 shadow-2xl"
          : "z-10"
      }`}
      title={`${post.author} in ${post.city}`}
      aria-label={`Photo story by ${post.author} in ${post.city}`}
    >
      <div className="relative w-12 h-12 rounded overflow-hidden bg-stone-100 dark:bg-stone-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.caption}
          className="w-full h-full object-cover pointer-events-none"
          loading="lazy"
        />
        {/* Post count badge on bottom-right of picture (no emojis) */}
        {count && count > 1 && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-[#d94e34] text-white font-mono text-[9px] font-bold shadow-xs border border-white/40 leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>

      {/* Tiny pin stem indicator */}
      <div className="w-1.5 h-1.5 bg-stone-400 dark:bg-stone-500 rounded-full mx-auto mt-0.5" />
    </button>
  );
}
