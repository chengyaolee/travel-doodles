"use client";

import React, { useState } from "react";
import { RegionalFeed, RegionItem } from "./RegionalFeed";
import { ExplorePost } from "@/lib/explore/mockPosts";

interface MobileFeedSheetProps {
  countryCode: string | null;
  countryName: string;
  regionId: string | null;
  regionName: string;
  regionLocalName?: string;
  regionsList?: RegionItem[];
  onSelectRegion?: (regionId: string) => void;
  cities: Array<{ id: string; name: string }>;
  selectedCity: string | null;
  onSelectCity: (cityId: string | null) => void;
  posts: ExplorePost[];
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onClose: () => void;
  visibilityFilter: "everyone" | "friends";
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  onBackToWorld?: () => void;
  onBackToCountry?: () => void;
}

export function MobileFeedSheet(props: MobileFeedSheetProps) {
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">("half");

  const heightClass = {
    collapsed: "h-14",
    half: "h-[45vh]",
    expanded: "h-[85vh]",
  }[sheetState];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-primary)] border-t border-[var(--border-color)] shadow-2xl transition-all duration-300 ease-out flex flex-col md:hidden select-none pb-safe ${heightClass}`}
      role="region"
      aria-label="Mobile regional journal sheet"
    >
      {/* Drag & State Handle Bar */}
      <div className="h-10 px-4 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 bg-[var(--border-color)] rounded-full mx-auto" />
          <span className="text-xs font-semibold text-[var(--ink-primary)] truncate max-w-[140px]">
            {props.regionName || props.countryName}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-elevated)] text-[var(--ink-secondary)] font-mono">
            {props.posts.length}
          </span>
        </div>

        {/* Labeled State Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          {sheetState === "collapsed" && (
            <button
              onClick={() => setSheetState("half")}
              className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              aria-label="Expand feed to half screen"
            >
              Open ↗
            </button>
          )}

          {sheetState === "half" && (
            <>
              <button
                onClick={() => setSheetState("expanded")}
                className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                aria-label="Expand feed to full screen"
              >
                Full ⤢
              </button>
              <button
                onClick={() => setSheetState("collapsed")}
                className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                aria-label="Collapse feed to bottom bar"
              >
                Hide ↘
              </button>
            </>
          )}

          {sheetState === "expanded" && (
            <button
              onClick={() => setSheetState("half")}
              className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              aria-label="Collapse feed to half screen"
            >
              Half ⤡
            </button>
          )}

          <button
            onClick={props.onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
            aria-label="Close sheet"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Feed Content inside sheet */}
      {sheetState !== "collapsed" && (
        <div className="flex-1 overflow-hidden">
          <RegionalFeed {...props} />
        </div>
      )}
    </div>
  );
}
