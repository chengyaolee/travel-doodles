"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DoodlePin, DoodleGlobe, DoodleCompass } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { TravelDoodlePost } from "./CreatePostModal";
import {
  WORLD_VIEWBOX,
  WORLD_LAND_PATH,
  WORLD_GRATICULE_PATH,
  ACCURATE_CITIES,
  projectLngLatToWorldMap,
} from "@/lib/worldMapData";

function getPostMapCoords(post: TravelDoodlePost): { x: number; y: number; region: string } {
  // Check accurate city presets first
  const cityKey = post.city?.toLowerCase().trim();
  for (const [key, cityInfo] of Object.entries(ACCURATE_CITIES)) {
    if (cityInfo.name.toLowerCase() === cityKey || key === cityKey) {
      let region = "Americas";
      if (cityInfo.coords[0] > -30 && cityInfo.coords[0] < 60 && cityInfo.coords[1] > 35) region = "Europe";
      else if (cityInfo.coords[0] >= 60 && cityInfo.coords[1] > 0) region = "Asia";
      else if (cityInfo.coords[0] > 100 && cityInfo.coords[1] < 0) region = "Oceania";
      return { x: cityInfo.x, y: cityInfo.y, region };
    }
  }

  // Precise Mercator projection from post.coordinates [lng, lat]
  if (post.coordinates && post.coordinates.length >= 2 && (post.coordinates[0] !== 0 || post.coordinates[1] !== 0)) {
    const lng = post.coordinates[0];
    const lat = Math.max(-80, Math.min(84, post.coordinates[1]));
    const { x, y } = projectLngLatToWorldMap(lng, lat);

    let region = "Americas";
    if (lng > -30 && lng < 50 && lat > 30) region = "Europe";
    else if (lng >= 50 && lat > 0) region = "Asia";
    else if (lng > 90 && lat < 10) region = "Oceania";
    return { x, y, region };
  }

  return { x: 500, y: 335, region: "Americas" };
}

export function ExploreMapModal({
  isOpen,
  onClose,
  extraPosts = [],
  onViewProfile,
}: {
  isOpen: boolean;
  onClose: () => void;
  extraPosts?: TravelDoodlePost[];
  onViewProfile?: (username: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAudience, setFilterAudience] = useState<"all" | "friends" | "everyone">("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const allPosts = useMemo(() => {
    return extraPosts;
  }, [extraPosts]);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const coord = getPostMapCoords(post);
      if (selectedRegion !== "all" && coord.region.toLowerCase() !== selectedRegion.toLowerCase()) {
        return false;
      }
      if (filterAudience === "friends" && post.visibility !== "friends") {
        return false;
      }
      if (filterAudience === "everyone" && post.visibility !== "everyone") {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          post.city.toLowerCase().includes(q) ||
          post.country.toLowerCase().includes(q) ||
          post.caption.toLowerCase().includes(q) ||
          post.author.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allPosts, selectedRegion, filterAudience, searchQuery]);

  const activePost = allPosts.find((p) => p.id === activePinId);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full h-[92vh] max-w-7xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Floating Top Control Bar */}
        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
              <DoodleGlobe size={24} />
            </div>
            <div>
              <h2 className="font-hand text-2xl font-bold text-[var(--ink-primary)] leading-none">
                The Living Travel Whiteboard
              </h2>
              <p className="text-xs text-[var(--ink-secondary)] font-mono mt-0.5">
                {filteredPosts.length} doodled memories discovered
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <span className="absolute left-3 top-2.5 text-[var(--ink-secondary)]">
              <InkIcon name="search" size={14} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cities, countries, notes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
            />
          </div>

          {/* Audience Filter Pills */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-0.5 text-xs">
              {(["all", "friends", "everyone"] as const).map((aud) => (
                <button
                  key={aud}
                  onClick={() => setFilterAudience(aud)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors font-hand ${
                    filterAudience === aud
                      ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] font-bold"
                      : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>

            <Link
              href="/explore"
              className="px-3 py-1.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <span>Full Atlas</span>
              <span className="flex items-center gap-1 font-mono text-[11px]">&rarr;</span>
            </Link>

            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
            >
              <InkIcon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Region Sub-Bar */}
        <div className="px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-2 overflow-x-auto text-xs z-10 shrink-0">
          <span className="text-[var(--ink-secondary)] font-hand font-bold pr-2">Regions:</span>
          {["all", "Europe", "Asia", "Americas", "Oceania"].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRegion(r)}
              className={`px-3 py-0.5 rounded-full capitalize text-xs font-hand whitespace-nowrap transition-colors border cursor-pointer ${
                selectedRegion.toLowerCase() === r.toLowerCase()
                  ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)] font-bold"
                  : "bg-[var(--bg-primary)] text-[var(--ink-secondary)] border-[var(--border-color)] hover:border-[var(--ink-primary)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Main Infinite Canvas Board */}
        <div className="relative flex-1 bg-[var(--bg-secondary)] overflow-hidden flex items-center justify-center">
          {/* Subtle whiteboard grid */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden="true">
            <defs>
              <pattern id="grid-explore" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1" fill="var(--ink-primary)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-explore)" />
          </svg>

          {/* Zoom Floating Controls */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-1.5 bg-[var(--bg-primary)]/90 backdrop-blur-sm p-1.5 rounded-xl border border-[var(--border-color)] shadow-md">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 2.25))}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              title="Zoom in"
            >
              +
            </button>
            <span className="text-[10px] font-mono text-center text-[var(--ink-secondary)]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              title="Zoom out"
            >
              -
            </button>
            <button
              onClick={() => setZoom(1)}
              className="w-8 h-8 text-[11px] font-hand rounded-lg flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              title="Reset View"
            >
              ⟲
            </button>
          </div>

          {/* Compass Rose Decoration */}
          <div className="absolute bottom-4 left-4 opacity-20 pointer-events-none z-10 hidden sm:block">
            <DoodleCompass size={70} />
          </div>

          {/* Scaled Whiteboard Layer (viewBox 0 0 1000 560) */}
          <div
            className="w-full h-full relative transition-transform duration-200 ease-out origin-center flex items-center justify-center"
            style={{
              transform: `scale(${zoom})`,
            }}
          >
            <div className="relative w-full aspect-[1000/560] max-w-5xl">
              {/* Cartographically Accurate Coastlines SVG */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox={WORLD_VIEWBOX}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d={WORLD_GRATICULE_PATH}
                  stroke="var(--stroke-color)"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                  fill="none"
                  opacity="0.12"
                />

                <path
                  d={WORLD_LAND_PATH}
                  stroke="var(--stroke-color)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="var(--stroke-color)"
                  fillOpacity="0.03"
                />

                {/* Dotted Flight Corridors */}
                <path
                  d={`M ${ACCURATE_CITIES.nyc.x} ${ACCURATE_CITIES.nyc.y} Q 400 130, ${ACCURATE_CITIES.paris.x} ${ACCURATE_CITIES.paris.y}`}
                  stroke="var(--stroke-color)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  fill="none"
                  opacity="0.4"
                />
                <path
                  d={`M ${ACCURATE_CITIES.paris.x} ${ACCURATE_CITIES.paris.y} Q 680 120, ${ACCURATE_CITIES.tokyo.x} ${ACCURATE_CITIES.tokyo.y}`}
                  stroke="var(--stroke-color)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  fill="none"
                  opacity="0.4"
                />
                <path
                  d={`M ${ACCURATE_CITIES.tokyo.x} ${ACCURATE_CITIES.tokyo.y} Q 920 330, ${ACCURATE_CITIES.sydney.x} ${ACCURATE_CITIES.sydney.y}`}
                  stroke="var(--stroke-color)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  fill="none"
                  opacity="0.4"
                />
              </svg>

              {/* Pins on the Map */}
              {filteredPosts.map((post) => {
                const coords = getPostMapCoords(post);
                const isSelected = activePinId === post.id;

                return (
                  <div
                    key={post.id}
                    className="absolute cursor-pointer z-20 group select-none p-2 -m-2"
                    style={{
                      left: `${(coords.x / 1000) * 100}%`,
                      top: `${(coords.y / 560) * 100}%`,
                      transform: "translate(-50%, -100%)",
                    }}
                    onClick={() => setActivePinId(post.id)}
                  >
                    <div
                      className={`transition-all duration-200 flex flex-col items-center origin-bottom ${
                        isSelected
                          ? "scale-115 filter drop-shadow-xl"
                          : "group-hover:scale-105"
                      }`}
                    >
                      {/* Floating Mini Polaroid Thumbnail with needle pin */}
                      {post.image ? (
                        <div className="w-13 h-13 bg-white p-1 pb-3 rounded-2xs shadow-md border border-neutral-300 relative mb-1 group-hover:shadow-xl transition-shadow">
                          <img
                            src={post.image}
                            alt={post.city}
                            className="w-full h-full object-cover rounded-3xs"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-[var(--bg-elevated)] p-1 rounded-full shadow-md border border-[var(--border-color)] flex items-center justify-center text-xs mb-1 text-[var(--ink-secondary)]">
                          <InkIcon name="pen" size={14} />
                        </div>
                      )}

                      <DoodlePin
                        size={24}
                        filled={isSelected}
                        color={isSelected ? "var(--ink-primary)" : "var(--ink-secondary)"}
                      />

                      {/* Big city label: bold text without white badge or red dot */}
                      <span
                        className={`text-xs font-sans font-bold whitespace-nowrap mt-0.5 select-none transition-colors ${
                          isSelected
                            ? "text-[var(--ink-primary)] underline underline-offset-2 decoration-2"
                            : "text-[var(--ink-primary)]"
                        }`}
                        style={{
                          textShadow:
                            "0 1px 3px var(--bg-primary), 0 0 6px var(--bg-primary)",
                        }}
                      >
                        {post.city}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State Overlay */}
            {filteredPosts.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-30">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--ink-primary)] mb-3 shadow-md pointer-events-auto">
                  <InkIcon name="pin" size={24} />
                </div>
                <h3 className="font-hand text-xl font-bold text-[var(--ink-primary)]">
                  No Doodles on the Whiteboard Yet
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] max-w-sm mt-1 font-mono">
                  Publish your first travel doodle to pin your memories to this world canvas!
                </p>
              </div>
            )}
          </div>

          {/* Active Post Preview Floating Card */}
          {activePost && (
            <div
              className="absolute bottom-6 right-6 w-80 sm:w-92 bg-[var(--bg-primary)] rounded-3xl border-2 border-[var(--border-color)] shadow-2xl p-5 z-40 animate-fade-in-up"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => onViewProfile?.(activePost.author)}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity cursor-pointer group"
                >
                  <AnonymousAvatar
                    avatarUrl={activePost.avatar}
                    name={activePost.author}
                    size={32}
                    className="border border-[var(--border-color)]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--ink-primary)] block leading-none group-hover:underline">
                      {activePost.author}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-secondary)] mt-0.5 block">
                      {activePost.date}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setActivePinId(null)}
                  aria-label="Close pin preview"
                  className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold hover:bg-[var(--border-color)] cursor-pointer text-[var(--ink-primary)]"
                >
                  <InkIcon name="close" size={14} />
                </button>
              </div>

              {activePost.image && (
                <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100 mb-3 relative">
                  <img
                    src={activePost.image}
                    alt={activePost.city}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white rounded-lg text-xs font-hand">
                    {activePost.city}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-[var(--ink-primary)] font-bold mb-1">
                <DoodlePin size={14} filled />
                <span>{activePost.location}</span>
              </div>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed font-sans line-clamp-3 font-normal">
                &ldquo;{activePost.caption}&rdquo;
              </p>

              <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs font-hand text-[var(--ink-secondary)] flex items-center gap-1.5">
                  <InkIcon name="heart" size={14} />
                  <span>{activePost.likes} smiles</span>
                </span>
                <span className="text-[11px] font-mono uppercase text-[var(--ink-secondary)]">
                  #{activePost.visibility}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
