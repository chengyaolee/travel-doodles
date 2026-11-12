"use client";

import React, { useState } from "react";

interface AnonymousAvatarProps {
  src?: string | null;
  avatarUrl?: string | null;
  alt?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function AnonymousAvatar({
  src,
  avatarUrl,
  alt,
  name,
  size = 36,
  className = "",
}: AnonymousAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const effectiveSrc = src ?? avatarUrl;
  const effectiveAlt = alt ?? name ?? "Traveler";

  // If a valid image source exists and hasn't failed to load, render image
  if (effectiveSrc && !imgError && !effectiveSrc.includes("unsplash.com/photo-1535713875002")) {
    return (
      <img
        src={effectiveSrc}
        alt={effectiveAlt}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 border border-[var(--border-color)] ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  // Otherwise render clean monochromatic Facebook-style anonymous silhouette
  return (
    <div
      role="img"
      aria-label={effectiveAlt}
      className={`rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 40 40"
        fill="currentColor"
        className="w-full h-full translate-y-1"
        aria-hidden="true"
      >
        {/* Head */}
        <circle cx="20" cy="15" r="7" />
        {/* Shoulders / Bust */}
        <path d="M 6 36 C 6 27, 13 25, 20 25 C 27 25, 34 27, 34 36 Z" />
      </svg>
    </div>
  );
}
