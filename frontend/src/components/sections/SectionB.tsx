"use client";

import { useRef, useState, useEffect } from "react";
import { DoodleArrow, DoodleUnderline } from "@/components/doodles";

const STEPS = [
  {
    number: "01",
    title: "Pick a place",
    description: "Search for a destination, choose an undiscovered spot, or drop a wobbly pin anywhere on the world map.",
    doodle: (
      <svg width="56" height="56" viewBox="0 0 60 60" fill="none" className="stroke-[var(--ink-primary)]">
        <circle cx="30" cy="46" r="10" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.3" />
        <circle cx="30" cy="46" r="16" strokeWidth="1" strokeDasharray="4 4" opacity="0.2" />
        <path
          d="M30 14 C23 14 17 20 17 27 C17 36 28 45 30 46 C32 45 43 36 43 27 C43 20 37 14 30 14 Z"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="30" cy="27" r="4" strokeWidth="1.5" fill="var(--ink-primary)" fillOpacity="0.15" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Add your photos & story",
    description: "Upload real travel photographs, scribble hand-drawn notes, tag friends, and choose your favorite doodle accents.",
    doodle: (
      <svg width="56" height="56" viewBox="0 0 60 60" fill="none" className="stroke-[var(--ink-primary)]">
        <rect x="12" y="10" width="36" height="40" rx="2" strokeWidth="1.8" fill="none" transform="rotate(-3 30 30)" />
        <rect x="16" y="14" width="28" height="22" strokeWidth="1.2" fill="none" transform="rotate(-3 30 30)" />
        <path d="M19 32 L26 22 L32 28 L38 20 L42 30" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="17" y1="42" x2="38" y2="40" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 2" />
        <line x1="17" y1="46" x2="30" y2="45" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Pin it to the world",
    description: "Your memory joins the living digital whiteboard. Watch dotted routes connect your journey across borders.",
    doodle: (
      <svg width="56" height="56" viewBox="0 0 60 60" fill="none" className="stroke-[var(--ink-primary)]">
        <circle cx="30" cy="30" r="20" strokeWidth="1.8" fill="none" />
        <ellipse cx="30" cy="30" rx="9" ry="20" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.6" />
        <ellipse cx="30" cy="30" rx="20" ry="7" strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M16 18 Q26 4 44 14" strokeWidth="1.6" strokeDasharray="3 2" strokeLinecap="round" />
        <path d="M44 14 L42 9 M44 14 L39 16" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function SectionB({ onCreateClick }: { onCreateClick?: () => void }) {
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

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-4 sm:px-6 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-18 flex flex-col items-center">
          <div className="section-kicker mb-5">
            Make a memory
          </div>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.05em] leading-[1.1] text-[var(--ink-primary)]"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            Leave your{" "}
            <span className="font-hand relative inline-block whitespace-nowrap font-semibold">
              mark
              <span className="absolute -bottom-1 left-0 w-full flex justify-center">
                <DoodleUnderline width={110} animate={isVisible} delay={500} />
              </span>
            </span>
          </h2>
          <p
            className="text-[var(--ink-secondary)] text-base sm:text-lg mt-4 max-w-md mx-auto font-normal"
            style={{
              opacity: isVisible ? 1 : 0,
              transition: "opacity 0.8s ease 0.3s",
            }}
          >
            A place, a photograph, a few words. That’s how a journey becomes a memory.
          </p>
        </div>

        {/* Steps Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative items-stretch">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative flex flex-col items-center">
              {/* Desktop Horizontal Connector Arrow */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:flex absolute top-1/2 -right-7 -translate-y-1/2 z-20 pointer-events-none items-center justify-center"
                  style={{
                    opacity: isVisible ? 0.7 : 0,
                    transition: `opacity 0.6s ease ${0.6 + i * 0.3}s`,
                  }}
                >
                  <DoodleArrow
                    width={50}
                    height={24}
                    direction="right"
                    animate={isVisible}
                    delay={600 + i * 300}
                  />
                </div>
              )}

              {/* Step Card */}
              <div
                className="w-full h-full flex flex-col items-center text-center bg-[var(--bg-primary)] p-8 rounded-3xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-1"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(24px)",
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.2 + i * 0.15}s`,
                }}
              >
                {/* Icon Container */}
                <div className="w-20 h-20 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center mb-6 shrink-0 group-hover:scale-105 transition-transform">
                  {step.doodle}
                </div>

                {/* Step badge */}
                <span className="font-hand text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-secondary)] mb-3">
                  Step {step.number}
                </span>

                {/* Title */}
                <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)] mb-3 leading-snug">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-[var(--ink-secondary)] leading-relaxed font-normal flex-1">
                  {step.description}
                </p>
              </div>

              {/* Mobile Downward Connector Arrow */}
              {i < STEPS.length - 1 && (
                <div
                  className="flex md:hidden my-2 pointer-events-none items-center justify-center"
                  style={{
                    opacity: isVisible ? 0.6 : 0,
                    transition: `opacity 0.6s ease ${0.6 + i * 0.3}s`,
                  }}
                >
                  <DoodleArrow
                    width={28}
                    height={40}
                    direction="down"
                    animate={isVisible}
                    delay={600 + i * 300}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-14 text-center">
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-bold text-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <span className="font-hand text-xl font-bold leading-none">Try posting a doodle</span>
            <span>✏️</span>
          </button>
        </div>
      </div>
    </section>
  );
}
