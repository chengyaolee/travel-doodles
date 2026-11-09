"use client";

interface DoodleGlobeProps {
  size?: number;
  className?: string;
}

export function DoodleGlobe({ size = 48, className = "" }: DoodleGlobeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer circle */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Meridian (vertical ellipse) */}
      <ellipse
        cx="24"
        cy="24"
        rx="10"
        ry="20"
        stroke="var(--stroke-color)"
        strokeWidth="1"
        fill="none"
      />
      {/* Equator */}
      <ellipse
        cx="24"
        cy="24"
        rx="20"
        ry="6"
        stroke="var(--stroke-color)"
        strokeWidth="1"
        fill="none"
      />
      {/* Latitude lines */}
      <ellipse
        cx="24"
        cy="14"
        rx="16"
        ry="3"
        stroke="var(--stroke-color)"
        strokeWidth="0.75"
        fill="none"
        opacity="0.5"
      />
      <ellipse
        cx="24"
        cy="34"
        rx="16"
        ry="3"
        stroke="var(--stroke-color)"
        strokeWidth="0.75"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
