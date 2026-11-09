"use client";

import { useRef, useEffect } from "react";

interface DoodleArrowProps {
  width?: number;
  height?: number;
  direction?: "right" | "down" | "left" | "up";
  className?: string;
  animate?: boolean;
  delay?: number;
}

export function DoodleArrow({
  width = 120,
  height = 40,
  direction = "right",
  className = "",
  animate = true,
  delay = 0,
}: DoodleArrowProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!animate) return;
    [pathRef, headRef].forEach((ref) => {
      if (!ref.current) return;
      const el = ref.current;
      const length = el.getTotalLength();
      el.style.strokeDasharray = `${length}`;
      el.style.strokeDashoffset = `${length}`;
    });

    const timeout = setTimeout(() => {
      if (pathRef.current) {
        pathRef.current.style.transition = `stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)`;
        pathRef.current.style.strokeDashoffset = "0";
      }
      setTimeout(() => {
        if (headRef.current) {
          headRef.current.style.transition = `stroke-dashoffset 0.3s cubic-bezier(0.16, 1, 0.3, 1)`;
          headRef.current.style.strokeDashoffset = "0";
        }
      }, 600);
    }, delay);

    return () => clearTimeout(timeout);
  }, [animate, delay]);

  const rotations: Record<string, string> = {
    right: "rotate(0)",
    down: "rotate(90)",
    left: "rotate(180)",
    up: "rotate(270)",
  };

  const mid = height / 2;
  const shaft = `M 4 ${mid} Q ${width * 0.3} ${mid - 8} ${width * 0.5} ${mid + 2} Q ${width * 0.7} ${mid + 6} ${width - 16} ${mid}`;
  const head = `M ${width - 28} ${mid - 10} L ${width - 12} ${mid} L ${width - 28} ${mid + 10}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      style={{ transform: rotations[direction] }}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={shaft}
        stroke="var(--stroke-color)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        ref={headRef}
        d={head}
        stroke="var(--stroke-color)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
