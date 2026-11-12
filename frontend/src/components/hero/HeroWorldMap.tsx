"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { DoodlePin } from "@/components/doodles";
import {
  WORLD_VIEWBOX,
  WORLD_LAND_PATH,
  WORLD_GRATICULE_PATH,
  ACCURATE_CITIES,
} from "@/lib/worldMapData";
import { TravelDoodlePost } from "@/components/app/CreatePostModal";

export interface HeroPin {
  id: string;
  x: number;
  y: number;
  city: string;
  country: string;
  countryCode: string;
  label: string;
  note: string;
  src: string;
  rotation: number;
  date: string;
}

export function HeroWorldMap({
  onSelectPin,
  posts = [],
  onCreatePin,
}: {
  onSelectPin?: (city: string) => void;
  posts?: TravelDoodlePost[];
  onCreatePin?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [activePreview, setActivePreview] = useState<HeroPin | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  const parallax = (depth: number) => ({
    transform: `translate(${mousePos.x * depth}px, ${mousePos.y * depth}px)`,
    transition: "transform 0.25s ease-out",
  });

  // Map real database posts to SVG coordinate pins (Zero hardcoded placeholders)
  const heroPins: HeroPin[] = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    return posts.map((p, index) => {
      let x = 500;
      let y = 280;
      const cityKey = (p.city || "").toLowerCase().trim();
      const matchCity = Object.entries(ACCURATE_CITIES).find(
        ([k, c]) => k === cityKey || c.name.toLowerCase() === cityKey
      );

      if (matchCity) {
        x = matchCity[1].x;
        y = matchCity[1].y;
      } else if (p.coordinates && p.coordinates.length >= 2 && (p.coordinates[0] !== 0 || p.coordinates[1] !== 0)) {
        const lng = p.coordinates[0];
        const lat = Math.max(-80, Math.min(84, p.coordinates[1]));
        x = ((lng + 180) / 360) * 1000;
        y = 280 - (lat / 90) * 230;
      }

      const rotations = [-2.5, 2, -1.5, 3, -3, 1.5];
      return {
        id: p.id,
        x,
        y,
        city: p.city || "Destination",
        country: p.country || "World",
        countryCode: p.country || "",
        label: p.city || "Destination",
        note: p.caption || `Travel doodle in ${p.city}`,
        src: p.image || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
        rotation: rotations[index % rotations.length],
        date: p.date,
      };
    });
  }, [posts]);

  const handlePinClick = (pin: HeroPin) => {
    setActivePreview(activePreview?.id === pin.id ? null : pin);
    onSelectPin?.(pin.city);
  };

  return (
    <div
      ref={containerRef}
      className="hero-board relative w-full max-w-6xl mx-auto aspect-[4/3] sm:aspect-[1000/560] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Whiteboard Subtle Dot Grid Texture */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden="true">
        <defs>
          <pattern id="hero-real-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" fill="var(--ink-primary)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-real-grid)" />
      </svg>

      {/* Cartographically Accurate World Map SVG Layer */}
      <svg
        viewBox={WORLD_VIEWBOX}
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid meet"
        style={parallax(2)}
      >
        {/* Subtle graticule lines */}
        <path
          d={WORLD_GRATICULE_PATH}
          fill="none"
          stroke="var(--stroke-color)"
          strokeWidth="0.5"
          strokeDasharray="2,5"
          opacity="0.25"
        />

        {/* Continents & Landmasses */}
        <path
          d={WORLD_LAND_PATH}
          fill="var(--bg-primary)"
          stroke="var(--stroke-color)"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={isVisible ? 0.95 : 0}
          style={{
            transition: "opacity 1s ease-out, stroke-dashoffset 2s ease-out",
          }}
        />

        {/* Minimal oceanic latitude notes */}
        <text
          x="20"
          y="342"
          fontSize="9"
          fontFamily="var(--font-hand)"
          fill="var(--stroke-color)"
          opacity="0.3"
        >
          — 0° Equator
        </text>

        {/* Small hand-drawn clouds */}
        <g opacity="0.2">
          <path
            d="M 160 80 Q 170 60, 195 65 Q 220 60, 230 80 Q 225 95, 200 95 Q 170 95, 160 80 Z"
            stroke="var(--stroke-color)"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M 720 70 Q 735 50, 765 55 Q 795 50, 805 70 Q 795 85, 770 85 Q 735 85, 720 70 Z"
            stroke="var(--stroke-color)"
            strokeWidth="1"
            fill="none"
          />
        </g>
      </svg>

      {/* Pinned Photographs from Real Database Posts */}
      {heroPins.length > 0 ? (
        <div className="absolute inset-0 pointer-events-auto">
          {heroPins.map((pin) => {
            const isActive = activePreview?.id === pin.id;

            return (
              <button
                type="button"
                key={pin.id}
                aria-label={`View memory in ${pin.city}`}
                aria-pressed={isActive}
                className="absolute group cursor-pointer p-2 -m-2 select-none"
                style={{
                  left: `${(pin.x / 1000) * 100}%`,
                  top: `${(pin.y / 560) * 100}%`,
                  transform: `translate(-50%, -105%) rotate(${pin.rotation}deg)`,
                  zIndex: isActive ? 45 : 20,
                }}
                onClick={() => handlePinClick(pin)}
              >
                {/* Polaroid Frame */}
                <div
                  className={`w-16 sm:w-24 md:w-28 bg-white p-1 sm:p-1.5 pb-2 sm:pb-3.5 rounded-xs shadow-md border border-neutral-300 transition-all duration-200 group-hover:shadow-2xl group-hover:border-[var(--ink-primary)] ${
                    isActive
                      ? "ring-2 ring-[var(--ink-primary)] shadow-2xl scale-105"
                      : "group-hover:scale-[1.03]"
                  }`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-neutral-200 rounded-3xs">
                    <img
                      src={pin.src}
                      alt={pin.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <p className="font-sans text-[11px] sm:text-xs text-neutral-900 font-bold mt-1 sm:mt-1.5 text-center truncate px-0.5 leading-none">
                    {pin.label}
                  </p>
                </div>

                {/* Illustrated needle pin holding Polaroid to canvas */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
                  <DoodlePin size={22} filled color="var(--ink-primary)" />
                  <div className="w-7 h-2 bg-neutral-300/80 rounded-3xs shadow-2xs rotate-[-3deg] -mt-1.5" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Clean Database State: Living Whiteboard Canvas Invitation */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-20">
          <div className="pointer-events-auto flex flex-col items-center bg-[var(--bg-primary)]/90 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border-2 border-[var(--border-color)] shadow-xl max-w-sm animate-fade-in">
            <div className="relative mb-3 animate-bounce">
              <DoodlePin size={40} filled color="var(--ink-primary)" />
            </div>
            <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
              The world is a blank whiteboard.
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] mt-1.5 mb-5 leading-relaxed font-sans">
              No travel stories have been pinned yet. Be the very first explorer to drop a pin and leave a mark on the canvas.
            </p>
            {onCreatePin && (
              <button
                onClick={onCreatePin}
                className="px-4 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-sans text-xs font-semibold hover:opacity-90 transition-opacity shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Drop the First Pin</span>
                <span>📌</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Travel Memory Preview Modal (When a Pin is Selected) */}
      {activePreview && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:bottom-6 sm:left-6 sm:w-80 bg-[var(--bg-primary)] rounded-2xl border-2 border-[var(--border-color)] shadow-2xl p-4 z-50 animate-fade-in-up">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-1.5">
              <DoodlePin size={16} filled />
              <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                {activePreview.city}, {activePreview.country}
              </h4>
            </div>
            <button
              onClick={() => setActivePreview(null)}
              aria-label="Close memory preview"
              className="text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] px-2 py-0.5 rounded-full border border-[var(--border-color)] cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-[var(--ink-secondary)] font-hand text-base mb-3 leading-relaxed">
            &ldquo;{activePreview.note}&rdquo;
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--ink-secondary)] font-mono">
              {activePreview.date}
            </span>
            <Link
              href={`/explore?country=${activePreview.countryCode}&city=${encodeURIComponent(
                activePreview.city
              )}`}
              className="text-xs font-semibold text-[var(--ink-primary)] hover:underline flex items-center gap-1"
            >
              Explore on World Map 🗺️ →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
