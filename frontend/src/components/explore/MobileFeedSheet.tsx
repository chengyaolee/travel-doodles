"use client";

import React, { useState } from "react";
import { RegionalFeed, RegionItem } from "./RegionalFeed";
import { ExplorePost } from "@/lib/explore/mockPosts";
import { InkIcon } from "@/components/ui/InkIcon";

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
    collapsed: "h-16",
    half: "h-[52dvh]",
    expanded: "h-[calc(100dvh-9rem)]",
  }[sheetState];

  return (
    <div className={`mobile-feed-sheet ${heightClass}`} role="region" aria-label="Mobile regional stories">
      <div className="mobile-sheet-bar">
        <span className="sheet-handle" aria-hidden="true" />
        <span className="mobile-sheet-title">{props.regionName || props.countryName}<span>{props.posts.length} stories</span></span>
        <div className="mobile-sheet-actions">
          {sheetState === "collapsed" ? <button onClick={() => setSheetState("half")} aria-label="Expand feed to half screen">Open ↑</button> : <>
            <button onClick={() => setSheetState(sheetState === "half" ? "expanded" : "half")} aria-label={sheetState === "half" ? "Expand feed to full screen" : "Collapse feed to half screen"}>{sheetState === "half" ? "Expand ↑" : "Less ↓"}</button>
            <button onClick={() => setSheetState("collapsed")} aria-label="Collapse feed to bottom bar">Hide</button>
          </>}
          <button onClick={props.onClose} aria-label="Close sheet"><InkIcon name="close" size={17} /></button>
        </div>
      </div>
      {sheetState !== "collapsed" && <div className="flex-1 min-h-0 overflow-hidden"><RegionalFeed {...props} /></div>}
    </div>
  );
}
