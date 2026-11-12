"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { DoodleUnderline, DoodlePin } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { TravelDoodlePost } from "@/components/app/CreatePostModal";
import { useAuth } from "@/lib/authContext";

export function SectionC({
  posts = [],
  onCreateClick,
  onViewProfile,
}: {
  posts?: TravelDoodlePost[];
  onCreateClick?: () => void;
  onViewProfile?: (username: string) => void;
}) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const { requireAuth } = useAuth();

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

  // Build real traveler journey from database posts
  const { journeySteps, travelerProfile } = useMemo(() => {
    if (!posts || posts.length === 0) {
      return { journeySteps: [], travelerProfile: null };
    }

    const steps = posts.slice(0, 4).map((p) => ({
      id: p.id,
      city: p.city,
      country: p.country,
      date: p.date,
      image: p.image || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=350&fit=crop",
      note: p.caption || `Travel memory in ${p.city}`,
      likes: p.likes,
    }));

    const authorPosts = posts.filter((p) => p.author === posts[0].author);
    const profile = {
      name: posts[0].author,
      handle: `@${posts[0].author.toLowerCase().replace(/[^a-z0-9_]/g, "")}`,
      avatar: posts[0].avatar,
      countries: new Set(authorPosts.map((p) => p.country)).size,
      memories: authorPosts.length,
    };

    return { journeySteps: steps, travelerProfile: profile };
  }, [posts]);

  const toggleLike = (id: string) => {
    requireAuth("like this memory", () => {
      setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    });
  };

  const handleFollow = () => {
    requireAuth("follow this traveler", () => {
      setIsFollowing((prev) => !prev);
    });
  };

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center overflow-hidden"
    >
      {/* Header */}
      <div className="text-center mb-16 flex flex-col items-center">
        <div className="section-kicker mb-5">
          Follow the journey
        </div>
        <h2
          className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.05em] leading-[1.1] text-[var(--ink-primary)] mb-3"
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
              <DoodleUnderline width={160} animate={isVisible} delay={600} />
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
          Trace travel journeys connected across cities and continents with hand-drawn paths and personal postcards.
        </p>
      </div>

      {journeySteps.length > 0 && travelerProfile ? (
        <div className="w-full flex flex-col items-center gap-10">
          {/* Traveler Header */}
          <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] gap-4 shadow-sm">
            <button
              type="button"
              onClick={() => onViewProfile?.(travelerProfile.name)}
              className="flex items-center gap-4 text-left hover:opacity-85 transition-opacity cursor-pointer group"
            >
              <AnonymousAvatar
                avatarUrl={travelerProfile.avatar}
                name={travelerProfile.name}
                size={56}
                className="border-2 border-[var(--ink-primary)]"
              />
              <div>
                <h3 className="text-lg font-bold text-[var(--ink-primary)] group-hover:underline">
                  {travelerProfile.name}
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] font-mono">
                  {travelerProfile.handle} · {travelerProfile.countries} countries · {travelerProfile.memories} memories
                </p>
              </div>
            </button>

            <button
              onClick={handleFollow}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isFollowing
                  ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] border border-[var(--border-color)]"
                  : "bg-[var(--ink-primary)] text-[var(--bg-primary)] shadow-sm hover:opacity-90"
              }`}
            >
              {isFollowing ? (
                <>
                  <InkIcon name="check" size={13} />
                  <span>Following</span>
                </>
              ) : (
                <span>+ Follow</span>
              )}
            </button>
          </div>

          {/* Dotted Route Connector Cards */}
          <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {journeySteps.map((step, idx) => {
              const isLiked = Boolean(likedMap[step.id]);
              return (
                <div
                  key={step.id}
                  className="relative flex flex-col bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-neutral-200 mb-3 border border-[var(--border-color)]">
                    <img
                      src={step.image}
                      alt={step.city}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-secondary)] mb-1">
                    <span>Stop #{idx + 1}</span>
                    <span>{step.date}</span>
                  </div>
                  <h4 className="font-hand text-xl font-bold text-[var(--ink-primary)]">
                    {step.city}, {step.country}
                  </h4>
                  <p className="text-xs text-[var(--ink-secondary)] mt-1.5 leading-relaxed line-clamp-3 flex-1">
                    &ldquo;{step.note}&rdquo;
                  </p>
                  <div className="pt-3 mt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                    <button
                      onClick={() => toggleLike(step.id)}
                      className="text-xs flex items-center gap-1.5 text-[var(--ink-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <span className={isLiked ? "text-red-500" : ""}>
                        <InkIcon
                          name="heart"
                          size={14}
                          fill={isLiked ? "currentColor" : "none"}
                        />
                      </span>
                      <span>{step.likes + (isLiked ? 1 : 0)}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Clean Database State: Empty Journey Notice */
        <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--ink-primary)] flex items-center justify-center mb-4 text-[var(--ink-primary)]">
            <InkIcon name="plane" size={26} />
          </div>
          <h3 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
            No travel routes connected yet
          </h3>
          <p className="text-sm text-[var(--ink-secondary)] max-w-md mt-2 mb-6 leading-relaxed font-sans">
            Once travelers connect memories across multiple destinations, their travel routes will trace across this whiteboard canvas.
          </p>
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>Start a Travel Route</span>
              <InkIcon name="pen" size={14} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
