"use client";

interface DoodleSunProps {
  size?: number;
  className?: string;
}

export function DoodleSun({ size = 40, className = "" }: DoodleSunProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r="8"
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Rays - slightly irregular */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const radians = (angle * Math.PI) / 180;
        const inner = 11;
        const outer = 16 + (i % 2 === 0 ? 2 : 0);
        return (
          <line
            key={angle}
            x1={20 + Math.cos(radians) * inner}
            y1={20 + Math.sin(radians) * inner}
            x2={20 + Math.cos(radians) * outer}
            y2={20 + Math.sin(radians) * outer}
            stroke="var(--stroke-color)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
