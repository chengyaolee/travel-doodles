"use client";

interface DoodleStarProps {
  size?: number;
  className?: string;
  filled?: boolean;
}

export function DoodleStar({
  size = 20,
  className = "",
  filled = false,
}: DoodleStarProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 2 L12.5 7.5 L18 8 L14 12 L15 18 L10 15 L5 18 L6 12 L2 8 L7.5 7.5 Z"
        stroke="var(--stroke-color)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? "var(--stroke-color)" : "none"}
        opacity={filled ? 0.2 : 1}
      />
    </svg>
  );
}
