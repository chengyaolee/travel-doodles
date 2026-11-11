"use client";

import { useRef, useEffect } from "react";

interface DoodleRouteProps {
  points: Array<{ x: number; y: number }>;
  width?: number;
  height?: number;
  className?: string;
  animate?: boolean;
  delay?: number;
  showAirplane?: boolean;
}

export function DoodleRoute({
  points,
  width = 400,
  height = 200,
  className = "",
  animate = true,
  delay = 0,
  showAirplane = true,
}: DoodleRouteProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!animate || !pathRef.current) return;
    const path = pathRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;

    const timeout = setTimeout(() => {
      path.style.transition = `stroke-dashoffset 2s cubic-bezier(0.16, 1, 0.3, 1)`;
      path.style.strokeDashoffset = "0";
    }, delay);

    return () => clearTimeout(timeout);
  }, [animate, delay]);

  if (points.length < 2) return null;

  // Build a smooth curve through points
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    const cpy = Math.min(prev.y, curr.y) - 20; // Arc upward
    d += ` Q ${cpx} ${cpy} ${curr.x} ${curr.y}`;
  }

  const lastPoint = points[points.length - 1];
  const secondLast = points[points.length - 2];
  const angle = Math.atan2(lastPoint.y - secondLast.y, lastPoint.x - secondLast.x) * (180 / Math.PI);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={d}
        stroke="var(--stroke-color)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="6 6"
        fill="none"
      />
      {showAirplane && (
        <g transform={`translate(${lastPoint.x}, ${lastPoint.y}) rotate(${angle})`}>
          <path
            d="M-8 0 L0 -3 L8 0 L0 3 Z"
            stroke="var(--stroke-color)"
            strokeWidth="1.2"
            fill="var(--stroke-color)"
            opacity="0.3"
          />
          <line
            x1="-4"
            y1="0"
            x2="-12"
            y2="0"
            stroke="var(--stroke-color)"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.5"
          />
        </g>
      )}
    </svg>
  );
}
