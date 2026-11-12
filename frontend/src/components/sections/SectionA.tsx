"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { DoodlePin, DoodleUnderline } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import {
  WORLD_VIEWBOX,
  WORLD_LAND_PATH,
  ACCURATE_CITIES,
} from "@/lib/worldMapData";
import { TravelDoodlePost } from "@/components/app/CreatePostModal";

interface PinItem {
  id: string;
  x: number;
  y: number;
  region: string;
  city: string;
  country: string;
  countryCode: string;
  image: string;
  story: string;
}

export function SectionA({
  onExploreClick,
  posts = [],
  onCreateClick,
}: {
  onExploreClick?: () => void;
  posts?: TravelDoodlePost[];
  onCreateClick?: () => void;
}) {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [activePin, setActivePin] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Map real database posts to geographic pins (Zero hardcoded placeholders)
  const livePins: PinItem[] = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    return posts.map((p, index) => {
      let x = 50;
      let y = 50;
      const cityKey = (p.city || "").toLowerCase().trim();
      const matchCity = Object.entries(ACCURATE_CITIES).find(
        ([k, c]) => k === cityKey || c.name.toLowerCase() === cityKey
      );

      if (matchCity) {
        x = (matchCity[1].x / 1000) * 100;
        y = (matchCity[1].y / 560) * 100;
      } else if (p.coordinates && p.coordinates.length >= 2 && (p.coordinates[0] !== 0 || p.coordinates[1] !== 0)) {
        const lng = p.coordinates[0];
        const lat = Math.max(-80, Math.min(84, p.coordinates[1]));
        x = ((lng + 180) / 360) * 100;
        y = ((280 - (lat / 90) * 230) / 560) * 100;
      }

      return {
        id: p.id || String(index + 1),
        x,
        y,
        region: p.region || "World",
        city: p.city || "Destination",
        country: p.country || "World",
        countryCode: p.country || "",
        image: p.image || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=350&fit=crop",
        story: p.caption || `Travel story in ${p.city}`,
      };
    });
  }, [posts]);

  useEffect(() => {
    if (livePins.length > 0 && !activePin) {
      setActivePin(livePins[0].id);
    }
  }, [livePins, activePin]);

  const filteredPins = selectedRegion === "all"
    ? livePins
    : livePins.filter((p) => p.region.toLowerCase() === selectedRegion.toLowerCase());

  const active = livePins.find((p) => p.id === activePin) || livePins[0];

  return (
    <section
      ref={sectionRef}
      id="explore"
      className="py-24 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center"
    >
      {/* Header */}
      <div className="text-center mb-14 flex flex-col items-center">
        <div className="section-kicker mb-5">
          A world worth exploring
        </div>
        <h2
          className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.05em] leading-[1.1] text-[var(--ink-primary)] mb-3"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Every pin has a{" "}
          <span className="font-hand relative inline-block whitespace-nowrap font-semibold">
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
          Explore authentic travel memories, photos, and personal reflections pulled straight from travelers worldwide.
        </p>
      </div>

      {livePins.length > 0 ? (
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Map canvas */}
          <div className="lg:col-span-8 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-color)]">
              {/* Accurate SVG world map */}
              <svg viewBox={WORLD_VIEWBOX} className="w-full h-full">
                <path
                  d={WORLD_LAND_PATH}
                  fill="var(--bg-elevated)"
                  stroke="var(--stroke-color)"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Real Pins from Database */}
              {filteredPins.map((pin) => {
                const isActive = active?.id === pin.id;
                return (
                  <button
                    key={pin.id}
                    onClick={() => setActivePin(pin.id)}
                    className="absolute cursor-pointer p-2 -m-2 z-20 group"
                    style={{
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      transform: "translate(-50%, -100%)",
                    }}
                    title={`${pin.city}, ${pin.country}`}
                  >
                    <div className="relative flex flex-col items-center">
                      <DoodlePin
                        size={isActive ? 30 : 22}
                        filled={isActive}
                        color={isActive ? "var(--ink-primary)" : "var(--stroke-color)"}
                      />
                      <span className="mt-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-[var(--bg-primary)]/90 text-[var(--ink-primary)] border border-[var(--border-color)] shadow-xs whitespace-nowrap">
                        {pin.city}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Story Card */}
          <div className="lg:col-span-4 flex flex-col">
            {active ? (
              <div className="bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-200 border border-[var(--border-color)]">
                  <img
                    src={active.image}
                    alt={active.city}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                    {active.city}, {active.country}
                  </h3>
                  <p className="text-xs text-[var(--ink-secondary)] mt-2 leading-relaxed">
                    &ldquo;{active.story}&rdquo;
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                  <Link
                    href={`/explore?country=${active.countryCode}&city=${encodeURIComponent(
                      active.city
                    )}`}
                    className="text-xs font-semibold text-[var(--ink-primary)] hover:underline flex items-center gap-1"
                  >
                    <span>Explore on World Map</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* Clean Database State: Empty Whiteboard Notice */
        <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center shadow-sm">
          <DoodlePin size={44} filled className="mb-4 text-[var(--ink-primary)] animate-bounce" />
          <h3 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
            No memories pinned yet
          </h3>
          <p className="text-sm text-[var(--ink-secondary)] max-w-md mt-2 mb-6 leading-relaxed">
            The world board is completely clean right now. Be the first explorer to record an adventure and drop a pin on the digital whiteboard!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {onCreateClick && (
              <button
                onClick={onCreateClick}
                className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Pin the First Story</span>
                <InkIcon name="pin" size={14} />
              </button>
            )}
            <Link
              href="/explore"
              className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] font-semibold text-xs text-[var(--ink-primary)] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Explore the Atlas</span>
              <InkIcon name="map" size={14} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
