"use client";

import React, { useState } from "react";
import { InkIcon } from "@/components/ui/InkIcon";

export function DisputedBordersLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-11 flex items-center gap-2 px-3 text-xs font-medium rounded-xl bg-[var(--bg-primary)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        aria-expanded={isOpen}
        title="View boundary policy and dispute legend"
        aria-label="Boundary policy and dispute legend"
      >
        <span className="w-3 h-0.5 border-b-2 border-dashed border-[#8c3b2d] dark:border-[#e06c58] inline-block" />
        <span>Map key</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-3 w-80 p-5 rounded-xl bg-[var(--bg-primary)]/95 backdrop-blur-md border border-[var(--border-color)] shadow-2xl z-50 text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)]">
            <h4 className="font-semibold text-[var(--ink-primary)] flex items-center gap-2">
              <span className="w-3 h-0.5 border-b-2 border-dashed border-[#8c3b2d] dark:border-[#e06c58]" />
              Boundary Worldview Policy
            </h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
              aria-label="Close legend"
            >
              <InkIcon name="close" size={14} />
            </button>
          </div>
          <p className="text-[var(--ink-secondary)] leading-relaxed mb-2">
            Boundaries follow the <strong>United Nations Cartographic Standard Worldview</strong>.
            Disputed frontiers, armistice lines, and non-self-governing territories are rendered
            with distinct dashed lines to maintain neutral, objective cartographic representation.
          </p>
          <ul className="space-y-1 text-[11px] text-[var(--ink-secondary)] list-disc pl-4 mb-2">
            <li><strong>Western Sahara:</strong> Dashed line of partition; status subject to UN advisory.</li>
            <li><strong>Jammu & Kashmir:</strong> Dashed Line of Control (1972 Simla Agreement).</li>
            <li><strong>Cyprus:</strong> Green Line UN Buffer Zone patrolled by UNFICYP.</li>
            <li><strong>Golan Heights:</strong> UNDOF Armistice Demarcation Line.</li>
            <li><strong>Kosovo:</strong> Product code XK under UN Security Council Res 1244/99.</li>
          </ul>
          <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--ink-secondary)]">
            <span>Sources: geoBoundaries gbOpen & OSM</span>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--ink-primary)]"
            >
              OSM License
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
