"use client";

import { useRef, useState, useEffect } from "react";
import { DoodleArrow, DoodleUnderline } from "@/components/doodles";

export function SectionF({ onCreateClick }: { onCreateClick?: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.25 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-28 md:py-44 px-4 sm:px-6 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] relative overflow-hidden flex flex-col items-center"
    >
      {/* Background Floating Sketched Elements */}
      <div className="absolute top-12 left-10 opacity-10 pointer-events-none hidden md:block">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="30" stroke="var(--stroke-color)" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M40 10 L40 70 M10 40 L70 40" stroke="var(--stroke-color)" strokeWidth="1" />
        </svg>
      </div>
      <div className="absolute bottom-12 right-12 opacity-10 pointer-events-none hidden md:block">
        <svg width="100" height="60" viewBox="0 0 100 60" fill="none">
          <path d="M10 50 L40 15 L60 35 L80 10 L95 50 Z" stroke="var(--stroke-color)" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="max-w-3xl mx-auto text-center relative z-10 w-full flex flex-col items-center">
        <h2
          className="text-4xl sm:text-6xl md:text-7xl font-medium text-[var(--ink-primary)] leading-[1.08] tracking-tight"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Got a story?
          <br />
          <span className="font-hand relative inline-block mt-3">
            Put it on the map
            <span className="absolute -bottom-2 left-0 w-full flex justify-center">
              <DoodleUnderline width={360} animate={isVisible} delay={600} />
            </span>
          </span>
          .
        </h2>

        <p
          className="text-[var(--ink-secondary)] text-lg sm:text-xl md:text-2xl mt-8 max-w-xl mx-auto font-normal leading-relaxed"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.8s ease 0.3s",
          }}
        >
          Your next adventure deserves its own little doodle.
        </p>

        {/* CTA Section with Hand-Drawn Arrow */}
        <div
          className="mt-12 flex flex-col items-center gap-4 relative"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
          }}
        >
          {/* Large Hand-Drawn Arrow Pointing Directly Toward CTA */}
          <div className="flex flex-col items-center gap-1 animate-float">
            <span className="font-hand text-sm text-[var(--ink-secondary)]">Your turn!</span>
            <DoodleArrow
              width={110}
              height={44}
              direction="down"
              animate={isVisible}
              delay={750}
            />
          </div>

          <button
            onClick={onCreateClick}
            className="button-ink group"
          >
            <span className="text-sm font-medium">
              Create Your First Doodle
            </span>
            <span className="text-2xl transition-transform duration-200 group-hover:translate-x-1.5">
              →
            </span>
          </button>

          <span className="text-xs text-[var(--ink-secondary)] mt-3">
            Free digital canvas · Instant preview · No login needed
          </span>
        </div>
      </div>
    </section>
  );
}
