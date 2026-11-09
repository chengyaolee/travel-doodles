"use client";

import { useEffect, useRef, useState } from "react";
import { HeroWorldMap } from "./HeroWorldMap";
import { DoodleUnderline } from "@/components/doodles";

export function HeroSection({
  onStartDoodling,
  onExploreWorld,
  onSelectPin,
}: {
  onStartDoodling?: () => void;
  onExploreWorld?: () => void;
  onSelectPin?: (city: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[95vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-28 pb-16 overflow-hidden"
    >
      {/* Central Hero Header */}
      <div className="relative z-10 text-center max-w-3xl mx-auto mb-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-hand tracking-wider uppercase bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)] mb-6 shadow-xs">
          <span>✨</span>
          <span>A Living Travel Whiteboard</span>
        </div>

        <h1
          className="font-hand text-5xl sm:text-7xl md:text-8xl font-bold text-[var(--ink-primary)] leading-[1.05] tracking-tight mb-5"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          The world is your{" "}
          <span className="relative inline-block whitespace-nowrap">
            canvas
            <span className="absolute -bottom-1.5 left-0 w-full flex justify-center">
              <DoodleUnderline width={220} delay={700} />
            </span>
          </span>
          .
        </h1>

        <p
          className="text-base sm:text-lg md:text-xl text-[var(--ink-secondary)] max-w-xl mx-auto mt-6 leading-relaxed font-normal"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s",
          }}
        >
          Pin your adventures, doodle your memories, and explore the stories
          your friends leave around the world.
        </p>

        {/* Hero Actions */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
          }}
        >
          <button
            onClick={onStartDoodling}
            className="group px-8 py-3.5 text-base font-bold bg-[var(--ink-primary)] text-[var(--bg-primary)] rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2.5 cursor-pointer"
          >
            <span className="font-hand text-2xl font-bold leading-none">Start Doodling</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1">✏️</span>
          </button>

          <button
            onClick={onExploreWorld}
            className="px-8 py-3.5 text-base font-medium text-[var(--ink-primary)] bg-[var(--bg-elevated)] border-2 border-[var(--border-color)] hover:border-[var(--ink-primary)] rounded-2xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <span className="font-hand text-xl font-bold leading-none">Explore the World</span>
            <span>🗺️</span>
          </button>
        </div>
      </div>

      {/* Dominant Hero World Map Board */}
      <div
        className="relative z-0 w-full max-w-5xl mx-auto"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
        }}
      >
        <HeroWorldMap onSelectPin={onSelectPin} />
      </div>

      {/* Subtle Scroll Indicator */}
      <div className="mt-10 flex flex-col items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-xs text-[var(--ink-secondary)] font-hand">scroll to wander</span>
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none" className="animate-float">
          <rect x="3" y="1" width="8" height="13" rx="4" stroke="var(--ink-secondary)" strokeWidth="1.2" />
          <circle cx="7" cy="5" r="1.2" fill="var(--ink-secondary)" />
          <path d="M4 16 L7 19 L10 16" stroke="var(--ink-secondary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}
