"use client";

import React from "react";

export function PaperGrainOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 opacity-30 dark:opacity-20 mix-blend-overlay overflow-hidden select-none"
      aria-hidden="true"
    >
      <svg className="w-full h-full opacity-60">
        <filter id="paper-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.5   0 0 0 0 0.5   0 0 0 0 0.5   0 0 0 0.25 0"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#paper-grain)" />
      </svg>
    </div>
  );
}
