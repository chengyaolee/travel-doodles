"use client";

interface DoodlePinProps {
  size?: number;
  className?: string;
  filled?: boolean;
  color?: string;
}

/**
 * Hand-drawn needle pin component.
 * Features a spherical pearl/ball head and a sleek tapered needle tip
 * designed to look pinned directly into the travel whiteboard.
 */
export function DoodlePin({
  size = 32,
  className = "",
  filled = false,
  color = "var(--ink-primary)",
}: DoodlePinProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.18)}
      viewBox="0 0 32 38"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Soft ground puncture shadow where the needle tip enters the whiteboard */}
      <ellipse cx="16" cy="36" rx="4.5" ry="1.6" fill="currentColor" opacity="0.22" />

      {/* Tapered metallic needle shaft */}
      <path
        d="M 14.8 14 L 15.6 34.5 L 16 36 L 16.4 34.5 L 17.2 14 Z"
        fill="#94a3b8"
        stroke="#64748b"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* Needle specular chrome highlight line */}
      <line
        x1="16"
        y1="14"
        x2="16"
        y2="34"
        stroke="#ffffff"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Spherical Pearl / Ball Pin Head */}
      <circle
        cx="16"
        cy="9"
        r="7.5"
        fill={filled ? color : "var(--bg-primary)"}
        stroke={color}
        strokeWidth="1.6"
      />

      {/* 3D Specular reflection on the upper-left of the ball head */}
      <circle
        cx="13.8"
        cy="6.8"
        r="2.2"
        fill="#ffffff"
        opacity={filled ? 0.65 : 0.9}
      />
      <circle
        cx="14.8"
        cy="7.8"
        r="1"
        fill="#ffffff"
        opacity={filled ? 0.9 : 0.4}
      />
    </svg>
  );
}
