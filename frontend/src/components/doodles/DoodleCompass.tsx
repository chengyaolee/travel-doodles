"use client";

interface DoodleCompassProps {
  size?: number;
  className?: string;
}

export function DoodleCompass({ size = 48, className = "" }: DoodleCompassProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner ring */}
      <circle
        cx="24"
        cy="24"
        r="16"
        stroke="var(--stroke-color)"
        strokeWidth="0.75"
        fill="none"
        opacity="0.4"
      />
      {/* Compass needle */}
      <path
        d="M24 6 L27 24 L24 42 L21 24 Z"
        stroke="var(--stroke-color)"
        strokeWidth="1.2"
        fill="none"
      />
      {/* North fill */}
      <path
        d="M24 6 L27 24 L24 22 L21 24 Z"
        fill="var(--stroke-color)"
        opacity="0.15"
      />
      {/* Cardinal directions */}
      <text x="24" y="9" textAnchor="middle" fill="var(--stroke-color)" fontSize="5" fontFamily="var(--font-hand)">N</text>
      <text x="24" y="44" textAnchor="middle" fill="var(--stroke-color)" fontSize="5" fontFamily="var(--font-hand)">S</text>
      <text x="7" y="26" textAnchor="middle" fill="var(--stroke-color)" fontSize="5" fontFamily="var(--font-hand)">W</text>
      <text x="41" y="26" textAnchor="middle" fill="var(--stroke-color)" fontSize="5" fontFamily="var(--font-hand)">E</text>
    </svg>
  );
}
