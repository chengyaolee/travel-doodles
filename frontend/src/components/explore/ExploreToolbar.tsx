"use client";

import React, { useState, useRef, useEffect } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DoodleGlobe } from "@/components/doodles";
import { Brand } from "@/components/layout/Brand";
import { InkIcon } from "@/components/ui/InkIcon";
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
  onCreateDoodle?: () => void;
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
  onCreateDoodle,
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
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }
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
    }
  };

  return (
    <header className="explore-toolbar">
      <div className="explore-brand"><Brand /><span className="toolbar-page">Explore the world</span></div>

      <div ref={searchRef} className="place-search">
        <div className="place-search-field">
          <InkIcon name="search" size={19} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); setActiveIndex(-1); }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Where will you wander?"
            aria-label="Search countries and territories"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen && Boolean(searchQuery.trim())}
            aria-controls="place-results"
            aria-activedescendant={activeIndex >= 0 ? `place-${searchResults[activeIndex]?.code}` : undefined}
          />
          {searchQuery ? <button className="search-clear" onClick={() => { setSearchQuery(""); setActiveIndex(-1); }} aria-label="Clear search"><InkIcon name="close" size={16} /></button> : <span className="search-hint">Find a place</span>}
        </div>
        {isOpen && searchQuery.trim() && (
          <div id="place-results" role="listbox" aria-label="Places" className="place-results">
            <p className="search-results-label">Places to explore</p>
            {searchResults.length ? searchResults.map((item, index) => (
              <button
                key={item.code} id={`place-${item.code}`} role="option" aria-selected={index === activeIndex}
                onClick={() => handleSelectResult(item.code)} onMouseEnter={() => setActiveIndex(index)}
                className={`place-result ${index === activeIndex ? "is-active" : ""}`}
              >
                <span className="place-code">{item.code}</span><span>{item.displayName}</span><InkIcon name="arrow" size={16} />
              </button>
            )) : <p className="search-empty">No places found. Try a country name or code.</p>}
          </div>
        )}
      </div>

      <div className="audience-switch" aria-label="Whose stories to explore">
        <button onClick={() => onVisibilityChange("everyone")} aria-pressed={visibilityFilter === "everyone"}>Everyone</button>
        <button onClick={() => onVisibilityChange("friends")} aria-pressed={visibilityFilter === "friends"}><InkIcon name="people" size={16} />Friends</button>
      </div>

      <div className="toolbar-actions">
        {onCreateDoodle && (
          <button
            onClick={onCreateDoodle}
            className="h-9 px-3 rounded-lg bg-[#d94e34] hover:bg-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            title="Create a new doodle memory"
            aria-label="Create a new doodle memory"
          >
            <InkIcon name="plus" size={15} />
            <span className="hidden sm:inline">Doodle</span>
          </button>
        )}
        {selectedCountry && <button onClick={onResetWorld} className="world-reset" title="Back to world" aria-label="Back to world"><DoodleGlobe size={20} /><span>World view</span></button>}
        <div className="toolbar-zoom" aria-label="Map zoom">
          <button onClick={onZoomOut} title="Zoom out" aria-label="Zoom out"><InkIcon name="minus" size={17} /></button>
          <button onClick={onZoomIn} title="Zoom in" aria-label="Zoom in"><InkIcon name="plus" size={17} /></button>
        </div>
        <div className="toolbar-legend"><DisputedBordersLegend /></div>
        <ThemeToggle />
      </div>
    </header>
  );
}
