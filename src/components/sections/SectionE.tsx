"use client";

import { useRef, useState, useEffect } from "react";
import { DoodlePin, DoodleStar, DoodleCompass, DoodleGlobe } from "@/components/doodles";
import { WORLD_LAND_PATH } from "@/lib/worldMapData";

const PROFILE_DATA = {
  name: "Jordan Rivera",
  username: "@jordanwanders",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  bio: "Architect by day, wanderer by heartbeat. Collecting ferry tickets, mountain sunsets, and hand-drawn maps across 4 continents.",
  countries: 23,
  memories: 89,
  followers: 1240,
  photos: [
    { src: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=300&h=300&fit=crop", loc: "Venice canals", rot: -2 },
    { src: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&h=300&fit=crop", loc: "Route 66 desert", rot: 3 },
    { src: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=300&h=300&fit=crop", loc: "Santorini caldera", rot: -1.5 },
    { src: "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=300&h=300&fit=crop", loc: "Norwegian fjords", rot: 2 },
  ],
  timeline: [
    { year: "2026", places: ["Cusco & Machu Picchu", "Monteverde Cloud Forest", "Atacama Stargazing"] },
    { year: "2025", places: ["Chefchaouen Blue City", "Porto Douro Valley", "Snæfellsnes Peninsula"] },
    { year: "2024", places: ["Kyoto Gion District", "Seoul Bukchon Hanok", "Hạ Long Bay Cruise"] },
  ],
};

export function SectionE() {
  const [isFollowing, setIsFollowing] = useState(false);
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

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 max-w-6xl mx-auto w-full flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-16 flex flex-col items-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-hand tracking-wider uppercase bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] mb-4">
          Personal Travel Board
        </div>
        <h2
          className="font-hand text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--ink-primary)]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Your own little corner of the world
        </h2>
        <p
          className="text-[var(--ink-secondary)] text-base sm:text-lg mt-4 max-w-lg mx-auto font-normal"
          style={{ opacity: isVisible ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}
        >
          Your profile acts as your private digital travel whiteboard — an evolving tapestry of everywhere you&apos;ve touched.
        </p>
      </div>

      {/* Main Profile Doodle Board Container */}
      <div
        className="bg-[var(--bg-secondary)] rounded-3xl border-2 border-[var(--border-color)] p-6 sm:p-10 relative overflow-hidden shadow-sm"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
        }}
      >
        {/* Whiteboard grid texture */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" aria-hidden="true">
          <defs>
            <pattern id="grid-e-whiteboard" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="11" cy="11" r="0.8" fill="var(--ink-primary)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-e-whiteboard)" />
        </svg>

        {/* Decorative Compass */}
        <div className="absolute top-6 right-6 opacity-20 pointer-events-none hidden sm:block">
          <DoodleCompass size={56} />
        </div>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-[var(--border-color)] relative z-10">
          <div className="relative">
            <img
              src={PROFILE_DATA.avatar}
              alt={PROFILE_DATA.name}
              className="w-24 h-24 rounded-full object-cover border-2 border-[var(--ink-primary)] p-0.5 bg-[var(--bg-primary)] shadow-md"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--ink-primary)] text-[var(--bg-primary)] flex items-center justify-center text-xs">
              ✓
            </div>
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1.5">
              <h3 className="font-hand text-3xl font-bold text-[var(--ink-primary)] leading-none">
                {PROFILE_DATA.name}
              </h3>
              <span className="font-mono text-xs text-[var(--ink-secondary)] bg-[var(--bg-elevated)] px-2.5 py-0.5 rounded-full border border-[var(--border-color)]">
                {PROFILE_DATA.username}
              </span>
            </div>
            <p className="text-sm text-[var(--ink-secondary)] max-w-xl leading-relaxed mt-2 font-normal">
              {PROFILE_DATA.bio}
            </p>
          </div>

          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-6 py-2.5 text-sm font-medium rounded-2xl border transition-all cursor-pointer shadow-xs ${
              isFollowing
                ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] border-[var(--border-color)]"
                : "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-transparent hover:opacity-90"
            }`}
          >
            {isFollowing ? "Following Board ✓" : "Follow Board"}
          </button>
        </div>

        {/* Minimalist Visually Integrated Metrics */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 my-8 relative z-10">
          <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)] text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1.5 text-[var(--ink-primary)] mb-1">
              <DoodleGlobe size={20} />
              <span className="font-hand text-3xl font-bold leading-none">{PROFILE_DATA.countries}</span>
            </div>
            <span className="text-[11px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">Countries Visited</span>
          </div>

          <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)] text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1.5 text-[var(--ink-primary)] mb-1">
              <DoodlePin size={20} filled />
              <span className="font-hand text-3xl font-bold leading-none">{PROFILE_DATA.memories}</span>
            </div>
            <span className="text-[11px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">Pins Stamped</span>
          </div>

          <div className="bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)] text-center shadow-2xs">
            <div className="flex items-center justify-center gap-1.5 text-[var(--ink-primary)] mb-1">
              <DoodleStar size={20} filled />
              <span className="font-hand text-3xl font-bold leading-none">{(PROFILE_DATA.followers / 1000).toFixed(1)}k</span>
            </div>
            <span className="text-[11px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">Board Admirers</span>
          </div>
        </div>

        {/* Cohesive 2-Column Whiteboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          {/* Left Column: Personal Map + Pinned Photographs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Personal Map Silhouette */}
            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                  Personal Travel Map
                </span>
                <span className="font-mono text-xs text-[var(--ink-secondary)]">
                  23 countries · 4 active routes
                </span>
              </div>
              <div className="relative aspect-[1000/560] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 1000 560" fill="none">
                  {/* Cartographically accurate landmass */}
                  <path
                    d={WORLD_LAND_PATH}
                    stroke="var(--stroke-color)"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    fill="var(--bg-elevated)"
                    opacity="0.7"
                  />
                  {/* Accurate flight paths between visited destinations */}
                  {/* NYC (312.7, 222) -> Venice (518, 198) */}
                  <path
                    d="M 312.7 222 Q 410 160 518 198"
                    stroke="var(--ink-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                  {/* Venice (518, 198) -> Santorini (535, 218) */}
                  <path
                    d="M 518 198 Q 528 206 535 218"
                    stroke="var(--ink-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                  {/* Santorini (535, 218) -> Tokyo/Kyoto (853.5, 238.2) */}
                  <path
                    d="M 535 218 Q 700 130 853.5 238.2"
                    stroke="var(--ink-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                  {/* NYC (312.7, 222) -> Cusco (324, 380) */}
                  <path
                    d="M 312.7 222 Q 330 300 324 380"
                    stroke="var(--ink-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                  {/* Waypoint pins with subtle pulse */}
                  <g>
                    <circle cx="312.7" cy="222" r="5" fill="var(--ink-primary)" />
                    <circle cx="312.7" cy="222" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
                  </g>
                  <g>
                    <circle cx="518" cy="198" r="5" fill="var(--ink-primary)" />
                    <circle cx="518" cy="198" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
                  </g>
                  <g>
                    <circle cx="535" cy="218" r="4.5" fill="var(--ink-primary)" />
                  </g>
                  <g>
                    <circle cx="853.5" cy="238.2" r="5" fill="var(--ink-primary)" />
                    <circle cx="853.5" cy="238.2" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
                  </g>
                  <g>
                    <circle cx="324" cy="380" r="5" fill="var(--ink-primary)" />
                    <circle cx="324" cy="380" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Pinned Photographs Grid */}
            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-4 shadow-2xs">
              <span className="font-hand text-lg font-bold text-[var(--ink-primary)] block mb-3 px-1">
                Pinned Memories
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROFILE_DATA.photos.map((item, i) => (
                  <div
                    key={i}
                    className="relative bg-white p-2 pb-6 rounded-xs shadow-xs border border-neutral-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer"
                    style={{ transform: `rotate(${item.rot}deg)` }}
                  >
                    <div className="aspect-square overflow-hidden bg-neutral-100 rounded-2xs mb-1.5">
                      <img src={item.src} alt={item.loc} className="w-full h-full object-cover" />
                    </div>
                    <p className="font-hand text-[11px] text-neutral-800 text-center truncate font-bold px-0.5">
                      {item.loc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Travel Timeline */}
          <div className="lg:col-span-5 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 shadow-2xs flex flex-col">
            <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] mb-6 block">
              Travel Timeline Log
            </span>
            <div className="space-y-6 flex-1">
              {PROFILE_DATA.timeline.map((item) => (
                <div key={item.year} className="relative pl-6 border-l-2 border-dashed border-[var(--border-color)]">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-2 top-0.5 w-3.5 h-3.5 rounded-full bg-[var(--ink-primary)] border-2 border-[var(--bg-primary)]" />
                  <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block mb-2 leading-none">
                    {item.year}
                  </span>
                  <div className="flex flex-col gap-2">
                    {item.places.map((place) => (
                      <div
                        key={place}
                        className="p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center gap-2 text-xs text-[var(--ink-primary)] font-medium"
                      >
                        <DoodlePin size={14} filled />
                        <span>{place}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
