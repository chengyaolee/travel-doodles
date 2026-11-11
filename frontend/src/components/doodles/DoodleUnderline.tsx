"use client";

import { useRef, useEffect } from "react";

interface DoodleUnderlineProps {
  width?: number;
  className?: string;
  animate?: boolean;
  delay?: number;
  color?: string;
}

export function DoodleUnderline({
  width = 200,
  className = "",
  animate = true,
  delay = 0,
  color = "var(--stroke-color)",
}: DoodleUnderlineProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!animate || !pathRef.current) return;
    const path = pathRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const timeout = setTimeout(() => {
      path.style.transition = `stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)`;
      path.style.strokeDashoffset = "0";
    }, delay);

    return () => clearTimeout(timeout);
  }, [animate, delay]);

  const d = `M 0 6 C ${width * 0.2} 2, ${width * 0.4} 10, ${width * 0.5} 6 C ${width * 0.6} 2, ${width * 0.8} 9, ${width} 5`;

  return (
    <svg
      width={width}
      height="12"
      viewBox={`0 0 ${width} 12`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={d}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
