"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { DoodlePin } from "@/components/doodles";
import {
  WORLD_VIEWBOX,
  WORLD_LAND_PATH,
  WORLD_GRATICULE_PATH,
  ACCURATE_CITIES,
} from "@/lib/worldMapData";

export interface HeroPin {
  id: string;
  x: number;
  y: number;
  city: string;
  country: string;
  label: string;
  note: string;
  src: string;
  rotation: number;
  date: string;
}

export const HERO_PINS: HeroPin[] = [
  {
    id: "nyc",
    x: ACCURATE_CITIES.nyc.x,
    y: ACCURATE_CITIES.nyc.y,
    city: "New York",
    country: "USA",
    label: "NYC",
    note: "Watching twilight settle over the Manhattan skyline from Brooklyn Bridge.",
    src: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=300&fit=crop",
    rotation: -3,
    date: "April 2026",
  },
  {
    id: "paris",
    x: ACCURATE_CITIES.paris.x,
    y: ACCURATE_CITIES.paris.y,
    city: "Paris",
    country: "France",
    label: "Paris",
    note: "Fresh croissants by the Seine while sketching the bridges.",
    src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
    rotation: 2.5,
    date: "May 2026",
  },
  {
    id: "tokyo",
    x: ACCURATE_CITIES.tokyo.x,
    y: ACCURATE_CITIES.tokyo.y,
    city: "Tokyo",
    country: "Japan",
    label: "Tokyo",
    note: "Electric alleys of Akihabara and steaming ramen in Shinjuku.",
    src: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
    rotation: -2,
    date: "May 2026",
  },
  {
    id: "capetown",
    x: ACCURATE_CITIES.capetown.x,
    y: ACCURATE_CITIES.capetown.y,
    city: "Cape Town",
    country: "South Africa",
    label: "Cape Town",
    note: "Table Mountain bathed in golden Atlantic mist at dusk.",
    src: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=300&fit=crop",
    rotation: 3.5,
    date: "March 2026",
  },
  {
    id: "sydney",
    x: ACCURATE_CITIES.sydney.x,
    y: ACCURATE_CITIES.sydney.y,
    city: "Sydney",
    country: "Australia",
    label: "Sydney",
    note: "Sunrise coastal walk from Coogee to Bondi. Ocean spray everywhere.",
    src: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=300&fit=crop",
    rotation: -2.5,
    date: "February 2026",
  },
];

export function HeroWorldMap({ onSelectPin }: { onSelectPin?: (city: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [activePreview, setActivePreview] = useState<HeroPin | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const handlePinClick = (pin: HeroPin) => {
    setActivePreview(activePreview?.id === pin.id ? null : pin);
    onSelectPin?.(pin.city);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl mx-auto aspect-[1000/560] overflow-hidden rounded-3xl border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm select-none"
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
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={WORLD_VIEWBOX}
        preserveAspectRatio="none"
        style={parallax(2)}
        aria-label="Accurate World Whiteboard Map"
      >
        {/* Subtle Latitude / Longitude Graticule Grid */}
        <path
          d={WORLD_GRATICULE_PATH}
          stroke="var(--stroke-color)"
          strokeWidth="0.5"
          strokeDasharray="2 4"
          fill="none"
          opacity="0.12"
        />

        {/* Real Coastline Outline with Hand-Drawn Doodle Aesthetic */}
        <path
          d={WORLD_LAND_PATH}
          stroke="var(--stroke-color)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="var(--stroke-color)"
          fillOpacity="0.03"
          className={isVisible ? "animate-stroke-draw" : ""}
          style={{
            strokeDasharray: 2500,
            strokeDashoffset: isVisible ? 0 : 2500,
            transition: "stroke-dashoffset 2.6s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Transatlantic Corridor: NYC -> Paris */}
        <path
          d={`M ${ACCURATE_CITIES.nyc.x} ${ACCURATE_CITIES.nyc.y} Q 400 130, ${ACCURATE_CITIES.paris.x} ${ACCURATE_CITIES.paris.y}`}
          stroke="var(--stroke-color)"
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          opacity="0.5"
        />
        {/* Eurasian Route: Paris -> Tokyo */}
        <path
          d={`M ${ACCURATE_CITIES.paris.x} ${ACCURATE_CITIES.paris.y} Q 680 120, ${ACCURATE_CITIES.tokyo.x} ${ACCURATE_CITIES.tokyo.y}`}
          stroke="var(--stroke-color)"
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          opacity="0.5"
        />
        {/* Pacific Journey: Tokyo -> Sydney */}
        <path
          d={`M ${ACCURATE_CITIES.tokyo.x} ${ACCURATE_CITIES.tokyo.y} Q 920 330, ${ACCURATE_CITIES.sydney.x} ${ACCURATE_CITIES.sydney.y}`}
          stroke="var(--stroke-color)"
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          opacity="0.5"
        />
        {/* North-South Route: Paris -> Cape Town */}
        <path
          d={`M ${ACCURATE_CITIES.paris.x} ${ACCURATE_CITIES.paris.y} Q 490 320, ${ACCURATE_CITIES.capetown.x} ${ACCURATE_CITIES.capetown.y}`}
          stroke="var(--stroke-color)"
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          opacity="0.4"
        />

        {/* Animated Sketched Airplanes on Routes */}
        <g transform="translate(400, 150) rotate(-14)">
          <text fontSize="12" fill="var(--stroke-color)" opacity="0.8">✈</text>
        </g>
        <g transform="translate(680, 160) rotate(12)">
          <text fontSize="12" fill="var(--stroke-color)" opacity="0.8">✈</text>
        </g>
        <g transform="translate(900, 340) rotate(96)">
          <text fontSize="12" fill="var(--stroke-color)" opacity="0.8">✈</text>
        </g>

        {/* Handwritten Geographic Annotations */}
        <text
          x="350"
          y="145"
          fontSize="13"
          fontFamily="var(--font-hand)"
          fill="var(--stroke-color)"
          opacity="0.6"
          transform="rotate(-5 350 145)"
        >
          transatlantic hop ✈️
        </text>

        <text
          x="660"
          y="140"
          fontSize="13"
          fontFamily="var(--font-hand)"
          fill="var(--stroke-color)"
          opacity="0.6"
          transform="rotate(3 660 140)"
        >
          silk skies to Tokyo ✦
        </text>

        <text
          x="750"
          y="390"
          fontSize="13"
          fontFamily="var(--font-hand)"
          fill="var(--stroke-color)"
          opacity="0.6"
          transform="rotate(-6 750 390)"
        >
          Pacific crossing 🌊
        </text>

        {/* Equator & Meridian subtle doodle markers */}
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

      {/* Floating Pinned Polaroid Photographs (Placed at Exact Geographic Coordinates) */}
      <div className="absolute inset-0 pointer-events-auto" style={parallax(4)}>
        {HERO_PINS.map((pin) => {
          const isHovered = hoveredId === pin.id;
          const isActive = activePreview?.id === pin.id;

          return (
            <div
              key={pin.id}
              className="absolute group cursor-pointer"
              style={{
                left: `${(pin.x / 1000) * 100}%`,
                top: `${(pin.y / 560) * 100}%`,
                transform: `translate(-50%, -105%) rotate(${pin.rotation}deg)`,
                zIndex: isHovered || isActive ? 40 : 20,
              }}
              onMouseEnter={() => setHoveredId(pin.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handlePinClick(pin)}
            >
              {/* Polaroid Frame */}
              <div
                className={`w-20 sm:w-24 md:w-28 bg-white p-1.5 pb-4 rounded-xs shadow-md border border-neutral-300 transition-all duration-300 ${
                  isHovered || isActive
                    ? "-translate-y-2 scale-110 shadow-2xl ring-2 ring-[var(--ink-primary)]"
                    : "group-hover:-translate-y-1 group-hover:shadow-lg"
                }`}
              >
                {/* Photo image */}
                <div className="aspect-[4/3] overflow-hidden bg-neutral-200 rounded-3xs">
                  <img
                    src={pin.src}
                    alt={pin.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* City name */}
                <p className="font-hand text-[10px] sm:text-xs text-neutral-900 font-bold mt-1.5 text-center truncate px-0.5 leading-none">
                  {pin.label}
                </p>
              </div>

              {/* Physical illustrated pin & tape */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <div className="w-8 h-2.5 bg-neutral-200/90 rounded-3xs shadow-2xs rotate-[-4deg] mb-0.5" />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--ink-primary)] shadow-sm" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Travel Memory Preview Modal (When a Pin is Selected) */}
      {activePreview && (
        <div
          className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 w-80 bg-[var(--bg-primary)] rounded-2xl border-2 border-[var(--border-color)] shadow-2xl p-4 z-50 animate-fade-in-up"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-1.5">
              <DoodlePin size={16} filled />
              <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                {activePreview.city}, {activePreview.country}
              </h4>
            </div>
            <button
              onClick={() => setActivePreview(null)}
              className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold hover:bg-[var(--border-color)] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="aspect-[16/10] rounded-xl overflow-hidden bg-neutral-100 mb-2.5">
            <img
              src={activePreview.src}
              alt={activePreview.city}
              className="w-full h-full object-cover"
            />
          </div>

          <p className="font-hand text-sm text-[var(--ink-secondary)] leading-snug font-normal">
            &ldquo;{activePreview.note}&rdquo;
          </p>

          <div className="mt-2.5 pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-secondary)]">
            <span>{activePreview.date}</span>
            <span className="font-hand text-xs text-[var(--ink-primary)]">#pinned</span>
          </div>
        </div>
      )}

      {/* Sketched Compass Rose in Bottom-Right Corner */}
      <div
        className="absolute bottom-3 right-3 opacity-25 pointer-events-none hidden sm:block"
        style={parallax(3)}
        aria-hidden="true"
      >
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <circle cx="22" cy="22" r="18" stroke="var(--stroke-color)" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M 22 6 L 25 22 L 22 38 L 19 22 Z" stroke="var(--stroke-color)" strokeWidth="1" />
          <path d="M 22 6 L 25 22 L 22 20 Z" fill="var(--stroke-color)" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
}
