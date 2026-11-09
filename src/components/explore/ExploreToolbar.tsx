"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DoodleGlobe } from "@/components/doodles";
import { DisputedBordersLegend } from "./DisputedBordersLegend";

export interface InventoryItem {
  code: string;
  displayName: string;
  aliases: string[];
  geometryId: string;
  labelAnchor: [number, number];
  cameraBounds: [[number, number], [number, number]];
  group?: string;
}

interface ExploreToolbarProps {
  inventory: InventoryItem[];
  selectedCountry: string | null;
  visibilityFilter: "everyone" | "friends";
  onVisibilityChange: (v: "everyone" | "friends") => void;
  onSelectCountry: (countryCode: string) => void;
  onSelectPlace?: (name: string, coords: [number, number]) => void;
  onResetWorld: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ExploreToolbar({
  inventory,
  selectedCountry,
  visibilityFilter,
  onVisibilityChange,
  onSelectCountry,
  onResetWorld,
  onZoomIn,
  onZoomOut,
}: ExploreToolbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter inventory based on query
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return inventory
      .filter((item) => {
        if (item.displayName.toLowerCase().includes(q)) return true;
        if (item.code.toLowerCase() === q) return true;
        return item.aliases.some((alias) => alias.toLowerCase().includes(q));
      })
      .slice(0, 8);
  }, [searchQuery, inventory]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (code: string) => {
    onSelectCountry(code);
    setSearchQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelectResult(searchResults[activeIndex].code);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <header className="h-14 md:h-16 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/90 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-3 relative z-30 select-none shadow-xs">
      {/* Left: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer" title="Return to Home">
          <DoodleGlobe size={26} className="text-[var(--ink-primary)] transition-transform duration-300 group-hover:rotate-12" />
          <div className="flex flex-col">
            <span className="font-hand text-xl md:text-2xl font-bold text-[var(--ink-primary)] leading-none tracking-tight">
              Travel Doodles
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[var(--ink-secondary)] uppercase">
              Atlas Sketchbook
            </span>
          </div>
        </Link>
      </div>

      {/* Middle: Place Search & Audience Switch */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg mx-auto">
        {/* Place Search Bar */}
        <div ref={searchRef} className="relative flex-1">
          <div className="relative flex items-center h-9">
            <span className="absolute left-3 text-[var(--ink-secondary)] pointer-events-none text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search 250 countries & islands..."
              aria-label="Search countries and territories"
              className="w-full h-9 pl-9 pr-8 text-xs rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-primary)] placeholder-[var(--ink-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)] transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 w-5 h-5 flex items-center justify-center text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 py-1 bg-[var(--bg-primary)]/95 backdrop-blur-md rounded-xl border border-[var(--border-color)] shadow-xl z-50 max-h-72 overflow-y-auto">
              {searchResults.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={item.code}
                    onClick={() => handleSelectResult(item.code)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isActive ? "bg-[var(--bg-secondary)] text-[var(--ink-primary)] font-medium" : "text-[var(--ink-primary)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--ink-secondary)]">
                        {item.code}
                      </span>
                      <span>{item.displayName}</span>
                    </div>
                    {item.aliases.length > 0 && (
                      <span className="text-[10px] text-[var(--ink-secondary)] truncate max-w-[120px]">
                        {item.aliases[0]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Explore / Friends Switch */}
        <div className="hidden sm:flex items-center h-9 p-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-medium shrink-0">
          <button
            onClick={() => onVisibilityChange("everyone")}
            className={`h-7 px-3.5 flex items-center justify-center rounded-full transition-all cursor-pointer whitespace-nowrap ${
              visibilityFilter === "everyone"
                ? "bg-[var(--bg-primary)] text-[var(--ink-primary)] shadow-xs font-semibold"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
            aria-pressed={visibilityFilter === "everyone"}
          >
            Explore
          </button>
          <button
            onClick={() => onVisibilityChange("friends")}
            className={`h-7 px-3.5 flex items-center justify-center rounded-full transition-all cursor-pointer whitespace-nowrap ${
              visibilityFilter === "friends"
                ? "bg-[var(--bg-primary)] text-[var(--ink-primary)] shadow-xs font-semibold"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
            aria-pressed={visibilityFilter === "friends"}
          >
            Friends
          </button>
        </div>
      </div>

      {/* Right Controls: Zoom, Reset World, Legend & Theme (Exact uniform h-9 height) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Back to world button */}
        {selectedCountry && (
          <button
            onClick={onResetWorld}
            className="h-9 flex items-center gap-1.5 px-3.5 text-xs font-medium rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
            title="Reset to world overview"
            aria-label="Back to world"
          >
            <span>🌍</span>
            <span className="hidden md:inline">Back to world</span>
          </button>
        )}

        {/* Zoom controls */}
        <div className="h-9 flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden shrink-0 shadow-xs">
          <button
            onClick={onZoomIn}
            className="w-9 h-9 flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="w-[1px] h-4 bg-[var(--border-color)]" />
          <button
            onClick={onZoomOut}
            className="w-9 h-9 flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
            title="Zoom out"
            aria-label="Zoom out"
          >
            –
          </button>
        </div>

        {/* Disputed borders legend trigger */}
        <div className="hidden lg:block shrink-0">
          <DisputedBordersLegend />
        </div>

        {/* Light/Dark Toggle */}
        <div className="shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
