"use client";

import { useRef, useState, useEffect } from "react";
import { DoodleUnderline, DoodlePin } from "@/components/doodles";

const JOURNEY = [
  {
    city: "London",
    country: "UK",
    date: "May 12",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&h=350&fit=crop",
    note: "Started the cross-continental trek under misty Tower Bridge. Packed sketchbooks only.",
    likes: 42,
  },
  {
    city: "Barcelona",
    country: "Spain",
    date: "May 16",
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=500&h=350&fit=crop",
    note: "Gaudí's curves make straight lines look boring. Sangria and midnight tapas with hostel pals.",
    likes: 88,
  },
  {
    city: "Rome",
    country: "Italy",
    date: "May 21",
    image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&h=350&fit=crop",
    note: "Pistachio gelato on the Spanish steps. Ancient stones radiating warmth.",
    likes: 104,
  },
  {
    city: "Istanbul",
    country: "Turkey",
    date: "May 27",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=500&h=350&fit=crop",
    note: "Bosphorus ferry at sunset. Where continents shake hands and call to prayer echoes across the water.",
    likes: 156,
  },
];

const PROFILE = {
  name: "Alex Rivera",
  handle: "@alex_wanders",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=face",
  countries: 14,
  memories: 52,
};

export function SectionC() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [likes, setLikes] = useState<Record<number, number>>({ 0: 42, 1: 88, 2: 104, 3: 156 });
  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
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

  const toggleLike = (idx: number) => {
    setLikedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
    setLikes((prev) => ({
      ...prev,
      [idx]: likedMap[idx] ? prev[idx] - 1 : prev[idx] + 1,
    }));
  };

  return (
    <section ref={sectionRef} id="stories" className="py-24 md:py-32 px-4 sm:px-6 max-w-5xl mx-auto w-full flex flex-col items-center">
      {/* Section Header */}
      <div className="text-center mb-16 flex flex-col items-center">
        <div className="section-kicker mb-5">
          Better with your people
        </div>
        <h2
          className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.05em] leading-[1.1] text-[var(--ink-primary)]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          See where your friends{" "}
          <span className="font-hand relative inline-block whitespace-nowrap font-semibold">
            wander
            <span className="absolute -bottom-1 left-0 w-full flex justify-center">
              <DoodleUnderline width={165} animate={isVisible} delay={500} />
            </span>
          </span>
        </h2>
        <p
          className="text-[var(--ink-secondary)] text-base sm:text-lg mt-4 max-w-lg mx-auto font-normal"
          style={{ opacity: isVisible ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}
        >
          Follow the dotted lines connecting your circle&apos;s adventures across cities, borders, and oceans.
        </p>
      </div>

      {/* Friend Profile Card Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mb-14 shadow-xs"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={PROFILE.avatar}
              alt={PROFILE.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[var(--ink-primary)] shadow-sm"
            />
            <span className="absolute -bottom-1 -right-1 text-xs">✈️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[var(--ink-primary)] leading-tight">{PROFILE.name}</h3>
              <span className="text-xs font-hand px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)]">
                Active Route
              </span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)] mt-0.5 font-mono">
              {PROFILE.handle} · {PROFILE.countries} countries · {PROFILE.memories} pinned memories
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFollowing(!isFollowing)}
          className={`px-5 py-2 text-sm font-medium rounded-full border transition-all duration-200 cursor-pointer ${
            isFollowing
              ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] border-[var(--border-color)]"
              : "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-transparent hover:opacity-90"
          }`}
        >
          {isFollowing ? "Following ✓" : "+ Follow Route"}
        </button>
      </div>

      {/* Dotted Journey Route Timeline */}
      <div className="relative">
        {/* Continuous Dotted Vertical Spine */}
        <div className="absolute left-6 md:left-1/2 top-8 bottom-8 w-0.5 -translate-x-1/2 border-l-2 border-dashed border-[var(--stroke-color)] opacity-30" />

        {JOURNEY.map((stop, i) => (
          <div
            key={stop.city}
            className={`relative flex flex-col md:flex-row items-center gap-8 mb-16 last:mb-0 ${
              i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
            }`}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(24px)",
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.25 + i * 0.12}s`,
            }}
          >
            {/* Numbered Waypoint Pin Badge */}
            <div className="absolute left-6 md:left-1/2 top-4 md:top-1/2 -translate-x-1/2 md:-translate-y-1/2 w-9 h-9 rounded-full bg-[var(--bg-primary)] border-2 border-[var(--ink-primary)] flex items-center justify-center z-10 shadow-md">
              <span className="font-mono text-xs font-bold text-[var(--ink-primary)]">{i + 1}</span>
            </div>

            {/* Story Text Column */}
            <div className={`w-full md:w-1/2 pl-14 md:pl-0 ${i % 2 === 0 ? "md:pr-14 md:text-right" : "md:pl-14 md:text-left"}`}>
              <div className="inline-flex items-center gap-1.5 font-hand text-sm text-[var(--ink-secondary)] mb-1">
                <span>{stop.date}</span>
                <span>·</span>
                <span>Leg #{i + 1}</span>
              </div>
              <h4 className="font-hand text-3xl font-bold text-[var(--ink-primary)] mb-2 leading-none">
                {stop.city}, {stop.country}
              </h4>
              <p className="text-sm text-[var(--ink-secondary)] leading-relaxed mb-4 font-normal">
                &ldquo;{stop.note}&rdquo;
              </p>

              {/* Social interactions */}
              <div className={`flex items-center gap-4 ${i % 2 === 0 ? "md:justify-end" : "md:justify-start"}`}>
                <button
                  onClick={() => toggleLike(i)}
                  className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                >
                  <span className={likedMap[i] ? "text-red-500 scale-125 transition-transform" : ""}>
                    {likedMap[i] ? "❤️" : "🤍"}
                  </span>
                  <span className="font-bold">{likes[i]}</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer">
                  <span>💬</span>
                  <span>Comment</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer">
                  <span>↗</span>
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Polaroid Photo Card */}
            <div className={`w-full md:w-1/2 pl-14 md:pl-0 ${i % 2 === 0 ? "md:pl-14" : "md:pr-14"}`}>
              <div
                className="relative group bg-white p-2.5 pb-8 rounded-xs shadow-md border border-neutral-300 max-w-sm mx-auto transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                style={{
                  transform: `rotate(${i % 2 === 0 ? -2 : 2.5}deg)`,
                }}
              >
                {/* Sketched Tape */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 h-4 bg-neutral-200/90 rounded-xs shadow-2xs z-10" />

                <div className="aspect-[4/3] overflow-hidden bg-neutral-100 rounded-2xs">
                  <img
                    src={stop.image}
                    alt={stop.city}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="mt-2.5 px-1 flex items-center justify-between">
                  <p className="font-hand text-sm text-neutral-800 font-bold">{stop.city}</p>
                  <p className="font-hand text-xs text-neutral-400">#traveldoodles</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
