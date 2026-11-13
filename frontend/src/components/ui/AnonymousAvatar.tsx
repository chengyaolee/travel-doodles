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
  const [defaultImgError, setDefaultImgError] = useState(false);
  const effectiveSrc = (src ?? avatarUrl)?.trim();
  const effectiveAlt = alt ?? name ?? "Traveler";

  // If a valid custom image source exists (and hasn't failed to load), render image
  if (
    effectiveSrc &&
    !imgError &&
    !effectiveSrc.includes("unsplash.com/photo-1535713875002") &&
    effectiveSrc !== "/default-avatar.png" &&
    effectiveSrc !== "/default-avatar-transparent.png"
  ) {
    return (
      <img
        src={effectiveSrc}
        alt={effectiveAlt}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 border border-[var(--border-color)] bg-[var(--bg-elevated)] ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  // Otherwise render the default smiley doodle globe profile picture
  if (!defaultImgError) {
    return (
      <div
        role="img"
        aria-label={effectiveAlt}
        className={`rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-color)] select-none ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <img
          src="/default-avatar-transparent.png"
          alt={effectiveAlt}
          width={size}
          height={size}
          onError={() => setDefaultImgError(true)}
          className="w-full h-full object-cover select-none pointer-events-none p-0.5"
        />
      </div>
    );
  }

  // Infallible inline SVG fallback matching the doodle globe with smiley
  return (
    <div
      role="img"
      aria-label={effectiveAlt}
      className={`rounded-full shrink-0 flex items-center justify-center overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-primary)] select-none p-1 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full select-none"
        aria-hidden="true"
      >
        {/* Globe outer circle */}
        <circle cx="50" cy="50" r="44" strokeWidth="4" />
        {/* Continents doodle outlines */}
        <path d="M 22 28 Q 28 20 40 24 Q 48 26 44 36 Q 38 46 28 48 Q 20 44 20 34 Z" fill="none" />
        <path d="M 52 26 Q 64 22 76 28 Q 84 34 82 46 Q 74 52 64 46 Q 58 40 54 34 Z" fill="none" />
        <path d="M 40 56 Q 52 52 60 62 Q 56 78 44 82 Q 36 78 38 68 Z" fill="none" />
        {/* Cute Doodle Smiley in the center: 2 simple solid dots for eyes */}
        <circle cx="44" cy="45" r="3.2" fill="currentColor" />
        <circle cx="56" cy="45" r="3.2" fill="currentColor" />
        <path d="M 44 54 Q 50 61 56 54" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
