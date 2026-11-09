"use client";

interface DoodleMountainProps {
  width?: number;
  height?: number;
  className?: string;
}

export function DoodleMountain({
  width = 80,
  height = 50,
  className = "",
}: DoodleMountainProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 50"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Main mountain */}
      <path
        d="M5 48 L32 8 L42 22 L50 14 L75 48 Z"
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Snow cap */}
      <path
        d="M28 16 L32 8 L36 16"
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Snow cap detail */}
      <path
        d="M28 16 L30 18 L33 15 L36 16"
        stroke="var(--stroke-color)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
