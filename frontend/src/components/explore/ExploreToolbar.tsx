"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DoodleGlobe, DoodlePin } from "@/components/doodles";
import { Brand } from "@/components/layout/Brand";
import { InkIcon } from "@/components/ui/InkIcon";
import { DisputedBordersLegend } from "./DisputedBordersLegend";
import type { RegionItem } from "./RegionalFeed";

export interface InventoryItem {
  code: string;
  displayName: string;
  aliases: string[];
  geometryId: string;
  labelAnchor: [number, number];
  cameraBounds: [[number, number], [number, number]];
  group?: string;
}

export type SearchResultType = "country" | "state" | "place";

export interface UnifiedSearchResult {
  id: string;
  type: SearchResultType;
  primaryLabel: string;
  stateLabel?: string;
  subtitle: string;
  countryCode?: string;
  regionId?: string;
  coordinates?: [number, number];
  bounds?: [[number, number], [number, number]];
}

interface ExploreToolbarProps {
  inventory: InventoryItem[];
  regionsInventory?: Record<string, RegionItem[]>;
  selectedCountry: string | null;
  visibilityFilter: "everyone" | "friends";
  onVisibilityChange: (v: "everyone" | "friends") => void;
  onSelectCountry: (countryCode: string) => void;
  onSelectRegion?: (regionId: string, countryCode?: string) => void;
  onSelectPlace?: (place: {
    name: string;
    displayName: string;
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
    regionId?: string;
    coordinates: [number, number];
  }) => void;
  onResetWorld: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCreateDoodle?: () => void;
}

export function ExploreToolbar({
  inventory,
  regionsInventory = {},
  selectedCountry,
  visibilityFilter,
  onVisibilityChange,
  onSelectCountry,
  onSelectRegion,
  onSelectPlace,
  onResetWorld,
  onZoomIn,
  onZoomOut,
  onCreateDoodle,
}: ExploreToolbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placeResults, setPlaceResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fast country name lookup map (code -> displayName)
  const countryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of inventory) {
      map.set(item.code.toUpperCase(), item.displayName);
    }
    return map;
  }, [inventory]);

  // Flatten regional subnational items (states/provinces/prefectures)
  const allRegions = useMemo(() => {
    if (!regionsInventory) return [];
    return Object.values(regionsInventory).flat();
  }, [regionsInventory]);

  // Debounced place/address autocomplete search (includes states and granular places)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setPlaceResults([]);
      setIsSearchingPlaces(false);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      setIsSearchingPlaces(true);
      fetch(`/api/v1/geo/autocomplete?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.results)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: UnifiedSearchResult[] = data.results.map((item: any) => {
              const stateText = item.state ? item.state : "";
              const subtitleParts = [
                item.city && item.city !== item.name ? item.city : "",
                stateText,
                item.country,
              ].filter(Boolean);

              return {
                id: item.id || `place-${item.name}-${Math.random()}`,
                type: item.regionId && !item.city ? "state" : "place",
                primaryLabel: item.name,
                stateLabel: stateText,
                subtitle: subtitleParts.join(", ") || item.displayName,
                countryCode: item.countryCode,
                regionId: item.regionId,
                coordinates: item.coordinates,
              };
            });
            setPlaceResults(mapped);
          }
        })
        .catch(() => {
          setPlaceResults([]);
        })
        .finally(() => {
          setIsSearchingPlaces(false);
        });
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  // Combine countries, states, and autocomplete place results
  const searchResults: UnifiedSearchResult[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const results: UnifiedSearchResult[] = [];

    // 1. Match countries from inventory
    for (const item of inventory) {
      const matchName = item.displayName.toLowerCase().includes(q);
      const matchCode = item.code.toLowerCase() === q;
      const matchAlias = item.aliases.some((a) => a.toLowerCase().includes(q));

      if (matchName || matchCode || matchAlias) {
        results.push({
          id: `country-${item.code}`,
          type: "country",
          primaryLabel: item.displayName,
          subtitle: `Country (${item.code})`,
          countryCode: item.code,
          coordinates: item.labelAnchor,
          bounds: item.cameraBounds,
        });
      }
      if (results.length >= 4) break;
    }

    // 2. Match states / provinces / prefectures from regions inventory
    let stateMatches = 0;
    for (const r of allRegions) {
      const matchName = r.name.toLowerCase().includes(q);
      const matchShort = r.shortName && r.shortName.toLowerCase() === q;
      const matchLocal = r.localName && r.localName.toLowerCase().includes(q);

      if (matchName || matchShort || matchLocal) {
        const countryName = countryNameMap.get(r.country.toUpperCase()) || r.country;
        const typeLabel = r.type || "State";
        results.push({
          id: `state-${r.id}`,
          type: "state",
          primaryLabel: `${r.name}${r.shortName ? ` (${r.shortName})` : ""}`,
          stateLabel: r.name,
          subtitle: `${typeLabel} in ${countryName}`,
          countryCode: r.country,
          regionId: r.id,
          coordinates: r.center,
          bounds: r.bounds,
        });
        stateMatches++;
      }
      if (stateMatches >= 4) break;
    }

    // 3. Add places / cities from autocomplete (which clearly include state)
    for (const p of placeResults) {
      const isDuplicate = results.some(
        (r) =>
          r.primaryLabel.toLowerCase() === p.primaryLabel.toLowerCase() &&
          r.countryCode === p.countryCode
      );
      if (!isDuplicate) {
        results.push(p);
      }
      if (results.length >= 10) break;
    }

    return results.slice(0, 10);
  }, [searchQuery, inventory, allRegions, countryNameMap, placeResults]);

  // Handle outside click to close results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (item: UnifiedSearchResult) => {
    if (item.type === "country" && item.countryCode) {
      onSelectCountry(item.countryCode);
    } else if (item.type === "state" && item.regionId) {
      if (onSelectRegion) {
        onSelectRegion(item.regionId, item.countryCode);
      } else if (item.countryCode) {
        onSelectCountry(item.countryCode);
      }
    } else if (item.type === "place") {
      if (onSelectPlace && item.coordinates) {
        onSelectPlace({
          name: item.primaryLabel,
          displayName: item.subtitle,
          city: item.primaryLabel,
          state: item.stateLabel,
          countryCode: item.countryCode,
          regionId: item.regionId,
          coordinates: item.coordinates,
        });
      } else if (item.regionId && onSelectRegion) {
        onSelectRegion(item.regionId, item.countryCode);
      } else if (item.countryCode) {
        onSelectCountry(item.countryCode);
      }
    }
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
      handleSelectResult(searchResults[activeIndex]);
    }
  };

  return (
    <header className="explore-toolbar">
      <div className="explore-brand">
        <Brand />
        <span className="toolbar-page">Explore the world</span>
      </div>

      <div ref={searchRef} className="place-search">
        <div className="place-search-field">
          <InkIcon name="search" size={19} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search places, states, or countries (e.g. Austin, Texas, Kyoto)..."
            aria-label="Search places, states, and countries"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen && Boolean(searchQuery.trim())}
            aria-controls="place-results"
            aria-activedescendant={
              activeIndex >= 0 ? `place-${searchResults[activeIndex]?.id}` : undefined
            }
          />
          {isSearchingPlaces && (
            <div className="mr-2">
              <div className="w-3.5 h-3.5 border-2 border-[#d94e34] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {searchQuery ? (
            <button
              className="search-clear"
              onClick={() => {
                setSearchQuery("");
                setActiveIndex(-1);
              }}
              aria-label="Clear search"
            >
              <InkIcon name="close" size={16} />
            </button>
          ) : (
            <span className="search-hint">Find a place</span>
          )}
        </div>

        {isOpen && searchQuery.trim() && (
          <div id="place-results" role="listbox" aria-label="Places" className="place-results">
            <p className="search-results-label">Places & States to explore</p>
            {searchResults.length ? (
              searchResults.map((item, index) => (
                <button
                  key={item.id}
                  id={`place-${item.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`place-result ${index === activeIndex ? "is-active" : ""}`}
                >
                  <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent)]">
                    {item.type === "country" && <InkIcon name="globe" size={15} />}
                    {item.type === "state" && <InkIcon name="map" size={15} />}
                    {item.type === "place" && <DoodlePin size={14} color="#d94e34" filled />}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[var(--ink-primary)] truncate text-xs">
                        {item.primaryLabel}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-secondary)] shrink-0">
                        {item.type === "state" ? "State" : item.type === "country" ? "Country" : "Place"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--ink-secondary)] truncate">
                      {item.subtitle}
                    </div>
                  </div>
                  <div className="shrink-0 text-[var(--ink-secondary)]">
                    <InkIcon name="arrow" size={14} />
                  </div>
                </button>
              ))
            ) : (
              <p className="search-empty">
                {isSearchingPlaces
                  ? "Searching atlas..."
                  : "No places or states found. Try a city, state, or country name."}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="audience-switch" aria-label="Whose stories to explore">
        <button
          onClick={() => onVisibilityChange("everyone")}
          aria-pressed={visibilityFilter === "everyone"}
        >
          Everyone
        </button>
        <button
          onClick={() => onVisibilityChange("friends")}
          aria-pressed={visibilityFilter === "friends"}
        >
          <InkIcon name="people" size={16} />
          Friends
        </button>
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
        {selectedCountry && (
          <button
            onClick={onResetWorld}
            className="world-reset"
            title="Back to world"
            aria-label="Back to world"
          >
            <DoodleGlobe size={20} />
            <span>World view</span>
          </button>
        )}
        <div className="toolbar-zoom" aria-label="Map zoom">
          <button onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
            <InkIcon name="minus" size={17} />
          </button>
          <button onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
            <InkIcon name="plus" size={17} />
          </button>
        </div>
        <div className="toolbar-legend">
          <DisputedBordersLegend />
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
