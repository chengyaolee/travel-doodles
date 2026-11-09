"use client";

import { useRef, useEffect } from "react";

interface DoodleLineProps {
  width?: number;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export function DoodleLine({ width = 120, className = "", animate = true, delay = 0 }: DoodleLineProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!animate || !pathRef.current) return;
    const path = pathRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const timeout = setTimeout(() => {
      path.style.transition = `stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)`;
      path.style.strokeDashoffset = "0";
    }, delay);

    return () => clearTimeout(timeout);
  }, [animate, delay]);

  const y = 8;
  const d = `M 2 ${y} Q ${width * 0.25} ${y - 2} ${width * 0.5} ${y + 1} Q ${width * 0.75} ${y + 3} ${width - 2} ${y - 1}`;

  return (
    <svg
      width={width}
      height="16"
      viewBox={`0 0 ${width} 16`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={d}
        stroke="var(--stroke-color)"
        strokeWidth="var(--stroke-width)"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
