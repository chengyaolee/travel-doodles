"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { DoodlePin, DoodleStar, DoodleCompass, DoodleGlobe } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { WORLD_LAND_PATH } from "@/lib/worldMapData";
import { TravelDoodlePost } from "@/components/app/CreatePostModal";
import { useAuth } from "@/lib/authContext";

export function SectionE({
  posts = [],
  onCreateClick,
}: {
  posts?: TravelDoodlePost[];
  onCreateClick?: () => void;
}) {
  const { user, isAuthenticated, openAuthModal, requireAuth } = useAuth();
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

  // Compute live user stats from database posts
  const userStats = useMemo(() => {
    if (!isAuthenticated || !user) return null;

    const myPosts = posts.filter(
      (p) =>
        p.author === user.display_name ||
        p.author === user.username ||
        p.author === user.custom_id
    );

    const countries = new Set(myPosts.map((p) => p.country).filter(Boolean));
    const photos = myPosts.filter((p) => Boolean(p.image));

    // Group timeline by year
    const timelineMap: Record<string, string[]> = {};
    for (const post of myPosts) {
      const year = post.date ? post.date.split("-")[0] : new Date().getFullYear().toString();
      if (!timelineMap[year]) timelineMap[year] = [];
      const place = `${post.city}, ${post.country}`;
      if (!timelineMap[year].includes(place)) {
        timelineMap[year].push(place);
      }
    }

    const timeline = Object.entries(timelineMap).map(([year, places]) => ({
      year,
      places,
    }));

    return {
      countriesCount: countries.size,
      memoriesCount: myPosts.length,
      photos,
      timeline,
      myPosts,
    };
  }, [posts, isAuthenticated, user]);

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-4 sm:px-6 max-w-6xl mx-auto w-full flex flex-col items-center"
    >
      {/* Header */}
      <div className="text-center mb-16 flex flex-col items-center">
        <div className="section-kicker mb-5">
          Uniquely yours
        </div>
        <h2
          className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.05em] leading-[1.1] text-[var(--ink-primary)]"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          Your own little corner of the world
        </h2>
        <p
          className="text-[var(--ink-secondary)] text-base sm:text-lg max-w-lg mx-auto mt-4 font-normal"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.8s ease 0.3s",
          }}
        >
          Every journey begins with a clean slate. Personal maps, pinned photographs, and your living travel sketchbook.
        </p>
      </div>

      {isAuthenticated && user && userStats ? (
        /* Authenticated Traveler Board */
        <div className="w-full bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-3xl p-6 sm:p-10 shadow-sm flex flex-col gap-8">
          {/* Traveler Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-8 border-b border-[var(--border-color)]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <AnonymousAvatar
                avatarUrl={user.avatar_url}
                name={user.display_name}
                size={80}
                className="border-2 border-[var(--ink-primary)] shadow-md"
              />
              <div>
                <h3 className="text-2xl font-bold text-[var(--ink-primary)]">
                  {user.display_name}
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] font-mono mt-0.5">
                  @{user.custom_id}
                </p>
                <p className="text-xs text-[var(--ink-secondary)] mt-2 max-w-md font-sans">
                  {user.bio}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="px-4 py-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-center">
                <span className="text-xl font-bold font-mono text-[var(--ink-primary)] block">
                  {userStats.countriesCount}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider">
                  Countries
                </span>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-center">
                <span className="text-xl font-bold font-mono text-[var(--ink-primary)] block">
                  {userStats.memoriesCount}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider">
                  Memories
                </span>
              </div>
            </div>
          </div>

          {/* Traveler Photos & Sketches */}
          {userStats.photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {userStats.photos.slice(0, 4).map((photo, i) => (
                <div
                  key={photo.id || i}
                  className="aspect-square rounded-2xl overflow-hidden bg-neutral-200 border-2 border-[var(--border-color)] shadow-xs"
                >
                  <img
                    src={photo.image}
                    alt={photo.location}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--border-color)] text-center flex flex-col items-center">
              <DoodlePin size={32} filled className="mb-2 text-[var(--ink-primary)]" />
              <p className="text-xs text-[var(--ink-secondary)] max-w-xs font-sans">
                You haven&apos;t pinned any travel memories to your board yet. Drop a pin on the map to start your collection!
              </p>
              {onCreateClick && (
                <button
                  onClick={onCreateClick}
                  className="mt-4 px-4 py-2 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                >
                  <span>Create Your First Memory</span>
                  <InkIcon name="pen" size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Guest Invitation Board (Zero Fake Profiles) */
        <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--ink-primary)] flex items-center justify-center mb-4 text-[var(--ink-primary)]">
            <InkIcon name="backpack" size={28} />
          </div>
          <h3 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
            Claim your personal travel board
          </h3>
          <p className="text-sm text-[var(--ink-secondary)] max-w-md mt-2 mb-6 leading-relaxed font-sans">
            Browsing the world atlas is free for everyone. Create a traveler passport to save pinned memories, record countries you visit, and share your sketchbook.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => openAuthModal("claim your personal travel board")}
              className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Create Free Account</span>
              <InkIcon name="sparkle" size={14} />
            </button>
            <button
              onClick={() => openAuthModal("log into your existing travel board")}
              className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] font-semibold text-xs text-[var(--ink-primary)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Log In</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
