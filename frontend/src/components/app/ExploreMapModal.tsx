"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DoodlePin, DoodleGlobe, DoodleCompass } from "@/components/doodles";
import { TravelDoodlePost } from "./CreatePostModal";
import {
  WORLD_VIEWBOX,
  WORLD_LAND_PATH,
  WORLD_GRATICULE_PATH,
  ACCURATE_CITIES,
} from "@/lib/worldMapData";

const INITIAL_BOARD_PINS: TravelDoodlePost[] = [
  {
    id: "pin-1",
    location: "New York, USA",
    city: "New York",
    country: "USA",
    caption: "Watching twilight settle over the Manhattan skyline from the ferry. Brooklyn bagel in hand.",
    date: "2026-04-12",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=500&h=350&fit=crop",
    doodleSticker: "",
    author: "Sam Miller",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
    likes: 67,
  },
  {
    id: "pin-2",
    location: "Paris, France",
    city: "Paris",
    country: "France",
    caption: "Le Marais bookstore hop in gentle rain. Found vintage art prints from 1920.",
    date: "2026-04-20",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=350&fit=crop",
    doodleSticker: "",
    author: "Camille Laurent",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    likes: 124,
  },
  {
    id: "pin-3",
    location: "Tokyo, Japan",
    city: "Tokyo",
    country: "Japan",
    caption: "Electric alleys of Akihabara at midnight. Neon reflections after an evening drizzle.",
    date: "2026-05-01",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&h=350&fit=crop",
    doodleSticker: "",
    author: "Kenji Sato",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    likes: 215,
  },
  {
    id: "pin-4",
    location: "Sydney, Australia",
    city: "Sydney",
    country: "Australia",
    caption: "Coastal cliff walk from Coogee to Bondi. Turquoise swells crashing against limestone.",
    date: "2026-05-04",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=500&h=350&fit=crop",
    doodleSticker: "",
    author: "Liam O'Connor",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    likes: 89,
  },
  {
    id: "pin-5",
    location: "Reykjavik, Iceland",
    city: "Reykjavik",
    country: "Iceland",
    caption: "Northern lights dancing across Thingvellir canyon. Cold air, hot thermos.",
    date: "2026-03-14",
    visibility: "friends",
    image: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=500&h=350&fit=crop",
    doodleSticker: "",
    author: "Freja Lind",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    likes: 340,
  },
  {
    id: "pin-6",
    location: "Rio de Janeiro, Brazil",
    city: "Rio",
    country: "Brazil",
    caption: "Samba rhythm flowing from Lapa arches. Ipanema coconut water at golden sunset.",
    date: "2026-02-28",
    visibility: "everyone",
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=500&h=350&fit=crop",
    doodleSticker: "",
    author: "Mateo Souza",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    likes: 182,
  },
];

const PIN_COORDINATES: Record<string, { x: number; y: number; region: string }> = {
  "pin-1": { x: ACCURATE_CITIES.nyc.x, y: ACCURATE_CITIES.nyc.y, region: "Americas" },
  "pin-2": { x: ACCURATE_CITIES.paris.x, y: ACCURATE_CITIES.paris.y, region: "Europe" },
  "pin-3": { x: ACCURATE_CITIES.tokyo.x, y: ACCURATE_CITIES.tokyo.y, region: "Asia" },
  "pin-4": { x: ACCURATE_CITIES.sydney.x, y: ACCURATE_CITIES.sydney.y, region: "Oceania" },
  "pin-5": { x: ACCURATE_CITIES.reykjavik.x, y: ACCURATE_CITIES.reykjavik.y, region: "Europe" },
  "pin-6": { x: ACCURATE_CITIES.rio.x, y: ACCURATE_CITIES.rio.y, region: "Americas" },
};

export function ExploreMapModal({
  isOpen,
  onClose,
  extraPosts = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  extraPosts?: TravelDoodlePost[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAudience, setFilterAudience] = useState<"all" | "friends" | "everyone">("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [activePinId, setActivePinId] = useState<string | null>("pin-2");

  const allPosts = useMemo(() => {
    return [...extraPosts, ...INITIAL_BOARD_PINS];
  }, [extraPosts]);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const coord = PIN_COORDINATES[post.id] || { region: "Americas" };
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
      onClick={onClose}
    >
      <div
        className="relative w-full h-[92vh] max-w-7xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
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
            <span className="absolute left-3 top-2.5 text-xs text-[var(--ink-secondary)]">🔍</span>
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
              <span>🗺️ →</span>
            </Link>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
            >
              ✕
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
                const coords = PIN_COORDINATES[post.id] || {
                  x: 500 + ((parseInt(post.id.slice(-2)) || 10) % 20) * 15 - 150,
                  y: 250 + ((parseInt(post.id.slice(-2)) || 10) % 20) * 10 - 50,
                };
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
                      <div className="w-13 h-13 bg-white p-1 pb-3 rounded-2xs shadow-md border border-neutral-300 relative mb-1 group-hover:shadow-xl transition-shadow">
                        <img
                          src={post.image}
                          alt={post.city}
                          className="w-full h-full object-cover rounded-3xs"
                        />
                      </div>

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
          </div>

          {/* Active Post Preview Floating Card */}
          {activePost && (
            <div
              className="absolute bottom-6 right-6 w-80 sm:w-92 bg-[var(--bg-primary)] rounded-3xl border-2 border-[var(--border-color)] shadow-2xl p-5 z-40 animate-fade-in-up"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <img
                    src={activePost.avatar}
                    alt={activePost.author}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[var(--ink-primary)] block leading-none">
                      {activePost.author}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-secondary)] mt-0.5 block">
                      {activePost.date}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActivePinId(null)}
                  className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold hover:bg-[var(--border-color)] cursor-pointer"
                >
                  ✕
                </button>
              </div>

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

              <div className="flex items-center gap-1.5 text-xs text-[var(--ink-primary)] font-bold mb-1">
                <DoodlePin size={14} filled />
                <span>{activePost.location}</span>
              </div>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed font-sans line-clamp-3 font-normal">
                &ldquo;{activePost.caption}&rdquo;
              </p>

              <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs font-hand text-[var(--ink-secondary)]">
                  ❤️ {activePost.likes} smiles
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
