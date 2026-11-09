"use client";

interface DoodlePinProps {
  size?: number;
  className?: string;
  filled?: boolean;
  color?: string;
}

export function DoodlePin({
  size = 32,
  className = "",
  filled = false,
  color = "var(--stroke-color)",
}: DoodlePinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Pin head - slightly wobbly circle */}
      <path
        d="M16 5C12.2 4.8 8.5 7.5 8.2 12c-0.3 4.5 3 6.5 5 9 1.2 1.5 2.5 4 2.8 6 0.3-2 1.6-4.5 2.8-6 2-2.5 5.3-4.5 5-9C23.5 7.5 19.8 4.8 16 5z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : "none"}
        opacity={filled ? 0.15 : 1}
      />
      {/* Inner dot */}
      <circle
        cx="16"
        cy="12"
        r="3"
        stroke={color}
        strokeWidth="1.5"
        fill={filled ? color : "none"}
        opacity={filled ? 0.3 : 1}
      />
    </svg>
  );
}
