"use client";

import { type ReactNode } from "react";

interface PolaroidCardProps {
  src: string;
  alt: string;
  caption?: string;
  location?: string;
  rotation?: number;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
  width?: number;
}

export function PolaroidCard({
  src,
  alt,
  caption,
  location,
  rotation = 0,
  className = "",
  onClick,
  width = 240,
}: PolaroidCardProps) {
  return (
    <div
      className={`group relative cursor-pointer ${className}`}
      style={{
        width,
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* Photo frame */}
      <div
        className="bg-white p-3 pb-12 shadow-photo rounded-sm transition-shadow duration-300 group-hover:shadow-lg"
        style={{
          transform: "group-hover:translateY(-4px)",
        }}
      >
        {/* Photo */}
        <div className="relative overflow-hidden bg-[#F0F0F0] aspect-[4/3]">
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Caption area */}
        <div className="absolute bottom-2 left-3 right-3">
          {caption && (
            <p
              className="font-hand text-sm text-[#333] truncate"
              style={{ fontSize: "0.85rem" }}
            >
              {caption}
            </p>
          )}
          {location && (
            <p className="font-hand text-xs text-[#888] mt-0.5 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M5 1C3.5 1 2 2.2 2 4c0 2 3 5 3 5s3-3 3-5c0-1.8-1.5-3-3-3z"
                  stroke="#888"
                  strokeWidth="0.8"
                  fill="none"
                />
              </svg>
              {location}
            </p>
          )}
        </div>
      </div>

      {/* Tape decoration */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-5 bg-[var(--ink-primary)] opacity-[0.06] rounded-sm"
        style={{ transform: `translateX(-50%) rotate(${-rotation * 0.5}deg)` }}
        aria-hidden="true"
      />
    </div>
  );
}
