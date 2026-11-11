"use client";

interface DoodleAirplaneProps {
  size?: number;
  className?: string;
  rotation?: number;
}

export function DoodleAirplane({
  size = 24,
  className = "",
  rotation = 0,
}: DoodleAirplaneProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M3 12l4-1.5L9 5l2 0.5 -1 5 4.5-1.5L21 3l-6 7.5 1 5L14 15l-5 1.5L3 12z"
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Contrail */}
      <path
        d="M6 15l-3 6"
        stroke="var(--stroke-color)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.5"
      />
    </svg>
  );
}
