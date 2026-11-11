"use client";

interface DoodleCloudProps {
  size?: number;
  className?: string;
}

export function DoodleCloud({ size = 60, className = "" }: DoodleCloudProps) {
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 60 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 28 C4 28 2 24 4 20 C2 16 6 12 12 12 C12 6 20 2 28 6 C34 2 44 4 46 10 C52 8 58 14 54 20 C58 24 56 28 50 28 Z"
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
