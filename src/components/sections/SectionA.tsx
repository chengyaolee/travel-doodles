"use client";

import { useRef, useState, useEffect } from "react";
import { DoodlePin, DoodleUnderline } from "@/components/doodles";
import {
  WORLD_VIEWBOX,
  WORLD_LAND_PATH,
  ACCURATE_CITIES,
} from "@/lib/worldMapData";

const PINS = [
  {
    id: 1,
    x: (ACCURATE_CITIES.nyc.x / 1000) * 100,
    y: (ACCURATE_CITIES.nyc.y / 560) * 100,
    region: "Americas",
    city: "New York",
    country: "USA",
    image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=500&h=350&fit=crop",
    story: "First time seeing the skyline from Brooklyn Bridge at dusk. Pure magic in the city that never sleeps.",
  },
  {
    id: 2,
    x: (ACCURATE_CITIES.paris.x / 1000) * 100,
    y: (ACCURATE_CITIES.paris.y / 560) * 100,
    region: "Europe",
    city: "Paris",
    country: "France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=350&fit=crop",
    story: "Fresh croissants by the Seine while sketching the bridges. Living inside a digital notebook.",
  },
  {
    id: 3,
    x: (ACCURATE_CITIES.capetown.x / 1000) * 100,
    y: (ACCURATE_CITIES.capetown.y / 560) * 100,
    region: "Africa",
    city: "Cape Town",
    country: "South Africa",
    image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=500&h=350&fit=crop",
    story: "Table Mountain bathed in golden hour mist. Coastal winds carrying sea salt through the streets.",
  },
  {
    id: 4,
    x: (ACCURATE_CITIES.tokyo.x / 1000) * 100,
    y: (ACCURATE_CITIES.tokyo.y / 560) * 100,
    region: "Asia",
    city: "Tokyo",
    country: "Japan",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&h=350&fit=crop",
    story: "Lost in the labyrinth of Omoide Yokocho. Found the best handmade tonkotsu ramen of my life.",
  },
  {
    id: 5,
    x: (ACCURATE_CITIES.sydney.x / 1000) * 100,
    y: (ACCURATE_CITIES.sydney.y / 560) * 100,
    region: "Oceania",
    city: "Sydney",
    country: "Australia",
    image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=500&h=350&fit=crop",
    story: "Bondi Beach sunrise surf session. Golden water reflecting pink clouds.",
  },
  {
    id: 6,
    x: (ACCURATE_CITIES.rio.x / 1000) * 100,
    y: (ACCURATE_CITIES.rio.y / 560) * 100,
    region: "Americas",
    city: "Rio de Janeiro",
    country: "Brazil",
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=500&h=350&fit=crop",
    story: "Christ the Redeemer soaring above the morning clouds. Breathtaking panoramas of the bay.",
  },
];

export function SectionA({ onExploreClick }: { onExploreClick?: () => void }) {
  const [activePin, setActivePin] = useState<number | null>(1);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const filteredPins = selectedRegion === "all"
    ? PINS
    : PINS.filter((p) => p.region.toLowerCase() === selectedRegion.toLowerCase());

  const active = PINS.find((p) => p.id === activePin);

  return (
    <section
      ref={sectionRef}
      id="explore"
      className="py-24 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center"
    >
      {/* Header */}
      <div className="text-center mb-14 flex flex-col items-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-hand tracking-wider uppercase bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] mb-4">
          Geographic Discovery
        </div>
        <h2
          className="font-hand text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--ink-primary)] mb-3"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Every pin has a{" "}
          <span className="relative inline-block whitespace-nowrap">
            story
            <span className="absolute -bottom-1 left-0 w-full flex justify-center">
              <DoodleUnderline width={130} animate={isVisible} delay={500} />
            </span>
          </span>
          .
        </h2>
        <p
          className="text-[var(--ink-secondary)] text-base sm:text-lg max-w-lg mx-auto mt-4 font-normal"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.8s ease 0.3s",
          }}
        >
          Select any hand-drawn pin to uncover authentic travel memories, photos, and personal reflections left on the canvas.
        </p>

        {/* Region Discovery Clustering Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          {["all", "Americas", "Europe", "Africa", "Asia", "Oceania"].map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-3.5 py-1 rounded-full text-xs font-hand capitalize transition-colors cursor-pointer border ${
                selectedRegion.toLowerCase() === reg.toLowerCase()
                  ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)] font-bold"
                  : "bg-[var(--bg-secondary)] text-[var(--ink-secondary)] border-[var(--border-color)] hover:border-[var(--ink-primary)]"
              }`}
            >
              #{reg}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Map Board Container */}
      <div
        className="relative w-full max-w-5xl bg-[var(--bg-secondary)] rounded-3xl border-2 border-[var(--border-color)] aspect-[1000/560] overflow-hidden shadow-sm flex items-center justify-center"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
        }}
      >
        {/* Subtle grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="grid-sec-a" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.9" fill="var(--ink-primary)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-sec-a)" />
        </svg>

        {/* Floating Top Controls */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[var(--bg-primary)]/90 backdrop-blur-md p-1.5 rounded-xl border border-[var(--border-color)] shadow-xs text-xs">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.6))}
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Zoom in"
          >
            +
          </button>
          <span className="font-mono px-1 text-[var(--ink-secondary)]">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
            title="Zoom out"
          >
            -
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-2 py-1 text-[11px] font-hand rounded-md hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Open Full Map Button */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {onExploreClick && (
            <button
              onClick={onExploreClick}
              className="px-3.5 py-1.5 text-xs font-bold text-[var(--bg-primary)] bg-[var(--ink-primary)] rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Open Infinite Map</span>
              <span>🗺️</span>
            </button>
          )}
        </div>

        {/* Scalable Canvas Layer with Real Coastlines */}
        <div
          className="w-full h-full relative transition-transform duration-300 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Cartographically Accurate Coastline SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={WORLD_VIEWBOX}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={WORLD_LAND_PATH}
              fill="var(--stroke-color)"
              fillOpacity="0.03"
              stroke="var(--stroke-color)"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 2"
              opacity="0.8"
            />
          </svg>

          {/* Interactive Pins Located Accurately on Real Landmasses */}
          {filteredPins.map((pin) => {
            const isSelected = activePin === pin.id;
            return (
              <button
                key={pin.id}
                className="absolute group cursor-pointer z-10 transition-transform duration-200"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
                onClick={() => setActivePin(isSelected ? null : pin.id)}
                aria-label={`View story in ${pin.city}`}
              >
                <div
                  className={`transition-all duration-200 flex flex-col items-center ${
                    isSelected
                      ? "scale-125 -translate-y-1.5 filter drop-shadow-lg"
                      : "group-hover:scale-110 group-hover:-translate-y-1"
                  }`}
                >
                  <DoodlePin
                    size={30}
                    filled={isSelected}
                    color={isSelected ? "var(--ink-primary)" : "var(--ink-secondary)"}
                  />
                  <span
                    className={`font-hand text-[11px] whitespace-nowrap px-1.5 py-0.5 rounded shadow-2xs mt-0.5 transition-colors ${
                      isSelected
                        ? "text-[var(--bg-primary)] bg-[var(--ink-primary)] font-bold"
                        : "text-[var(--ink-primary)] bg-[var(--bg-primary)] border border-[var(--border-color)]"
                    }`}
                  >
                    {pin.city}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pin Story Preview Card */}
        {active && (
          <div
            className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 w-72 sm:w-84 bg-[var(--bg-primary)] rounded-2xl border-2 border-[var(--border-color)] shadow-2xl overflow-hidden animate-fade-in-up z-30"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-elevated)]">
              <img
                src={active.image}
                alt={active.city}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                onClick={() => setActivePin(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80 transition-colors cursor-pointer"
                aria-label="Close preview"
              >
                ✕
              </button>
              <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white font-hand text-xs">
                Pinned Memory · {active.region}
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <DoodlePin size={16} filled />
                  <h3 className="font-hand text-xl font-bold text-[var(--ink-primary)] leading-none">
                    {active.city}, {active.country}
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[var(--ink-secondary)]">May 2026</span>
              </div>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed font-sans line-clamp-3 font-normal">
                {active.story}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
