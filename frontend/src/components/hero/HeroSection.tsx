"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { HeroWorldMap } from "./HeroWorldMap";
import { DoodleUnderline } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import { TravelDoodlePost } from "@/components/app/CreatePostModal";

export function HeroSection({
  onStartDoodling,
  onExploreWorld,
  onSelectPin,
  posts = [],
}: {
  onStartDoodling?: () => void;
  onExploreWorld?: () => void;
  onSelectPin?: (city: string) => void;
  posts?: TravelDoodlePost[];
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
      className="landing-hero relative flex flex-col items-center px-6 pt-36 md:pt-40 pb-16 overflow-hidden"
    >
      {/* Central Hero Header */}
      <div className="relative z-10 text-center max-w-3xl mx-auto mb-10 flex flex-col items-center">
        <h1
          className="text-5xl sm:text-7xl md:text-8xl font-medium text-[var(--ink-primary)] leading-[1.02] tracking-[-0.065em] mb-3"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}
        >
          The world is your{" "}
          <span className="font-hand relative inline-block whitespace-nowrap font-semibold tracking-tight">
            canvas<span className="font-sans">.</span>
            <span className="absolute -bottom-1.5 left-0 w-full flex justify-center">
              <DoodleUnderline width={220} delay={700} />
            </span>
          </span>
        </h1>

        <p
          className="text-base sm:text-lg text-[var(--ink-secondary)] max-w-lg mx-auto mt-6 leading-relaxed font-normal"
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
            className="button-ink group"
          >
            <span className="text-sm font-medium">Start Doodling</span>
            <InkIcon name="pen" size={17} />
          </button>

          <Link
            href="/explore"
            className="button-outline group select-none"
          >
            <span className="text-sm font-medium">Explore the World</span>
            <InkIcon name="arrow" size={18} />
          </Link>
        </div>
      </div>

      {/* Dominant Hero World Map Board */}
      <div
        className="relative z-0 w-full max-w-6xl mx-auto"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
        }}
      >
        <HeroWorldMap
          onSelectPin={onSelectPin}
          posts={posts}
          onCreatePin={onStartDoodling}
        />
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
