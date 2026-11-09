"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  countryCode: string;
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
    countryCode: "US",
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
    countryCode: "FR",
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
    countryCode: "JP",
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
    countryCode: "ZA",
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
    countryCode: "AU",
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
      {/* Kept stable without parallax movement to prevent hover flickering */}
      <div className="absolute inset-0 pointer-events-auto">
        {HERO_PINS.map((pin) => {
          const isActive = activePreview?.id === pin.id;

          return (
            <button
              type="button"
              key={pin.id}
              aria-label={`View memory in ${pin.city}`}
              aria-pressed={isActive}
              className={`absolute group cursor-pointer p-2 -m-2 select-none ${
                pin.id === "capetown" || pin.id === "sydney" ? "hidden sm:block" : ""
              }`}
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
                {/* Photo image */}
                <div className="aspect-[4/3] overflow-hidden bg-neutral-200 rounded-3xs">
                  <img
                    src={pin.src}
                    alt={pin.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* City name - bolded without red dot/background */}
                <p className="font-sans text-[11px] sm:text-xs text-neutral-900 font-bold mt-1 sm:mt-1.5 text-center truncate px-0.5 leading-none">
                  {pin.label}
                </p>
              </div>

              {/* Physical illustrated needle pin & tape holding the Polaroid to the canvas */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
                <DoodlePin size={22} filled color="var(--ink-primary)" />
                <div className="w-7 h-2 bg-neutral-300/80 rounded-3xs shadow-2xs rotate-[-3deg] -mt-1.5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Floating Travel Memory Preview Modal (When a Pin is Selected) */}
      {activePreview && (
        <div
          className="absolute bottom-3 left-3 right-3 sm:right-auto sm:bottom-6 sm:left-6 sm:w-80 bg-[var(--bg-primary)] rounded-2xl border-2 border-[var(--border-color)] shadow-2xl p-4 z-50 animate-fade-in-up"
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
              aria-label="Close memory preview"
              className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold hover:bg-[var(--border-color)] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="aspect-[3/1] sm:aspect-[16/10] rounded-lg overflow-hidden bg-neutral-100 mb-2.5">
            <img
              src={activePreview.src}
              alt={activePreview.city}
              className="w-full h-full object-cover"
            />
          </div>

          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed font-normal">
            &ldquo;{activePreview.note}&rdquo;
          </p>

          <div className="mt-2.5 pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-secondary)]">
            <span>{activePreview.date}</span>
            <span className="font-hand text-xs text-[var(--ink-primary)]">#pinned</span>
          </div>

          {/* Action button: Direct connection to Explore Page Map */}
          <Link
            href={`/explore?country=${activePreview.countryCode}&city=${encodeURIComponent(activePreview.city)}`}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-sans font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer select-none"
          >
            <span>Explore {activePreview.city} on World Map</span>
            <span>🗺️ →</span>
          </Link>
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
