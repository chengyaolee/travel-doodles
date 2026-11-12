"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { DoodleUnderline, DoodlePin } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import { TravelDoodlePost } from "@/components/app/CreatePostModal";
import Link from "next/link";

export function SectionD({
  posts = [],
  onCreateClick,
  onViewProfile,
}: {
  posts?: TravelDoodlePost[];
  onCreateClick?: () => void;
  onViewProfile?: (username: string) => void;
}) {
  const [selectedPost, setSelectedPost] = useState<TravelDoodlePost | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter real database posts with photographs (Zero hardcoded placeholders)
  const photoPosts = useMemo(() => {
    return (posts || []).filter((p) => Boolean(p.image));
  }, [posts]);

  return (
    <section
      ref={sectionRef}
      id="gallery"
      className="py-24 md:py-32 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col items-center"
    >
      {/* Header */}
      <div className="text-center mb-16 flex flex-col items-center">
        <div className="section-kicker mb-5">
          Curated memories
        </div>
        <h2
          className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.05em] leading-[1.1] text-[var(--ink-primary)] mb-3"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          A world full of{" "}
          <span className="font-hand relative inline-block whitespace-nowrap font-semibold">
            doodles
            <span className="absolute -bottom-1 left-0 w-full flex justify-center">
              <DoodleUnderline width={160} animate={isVisible} delay={500} />
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
          Travel moments captured in photographs, handwritten notes, and sketches from real journeys across the globe.
        </p>
      </div>

      {photoPosts.length > 0 ? (
        <div className="w-full columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {photoPosts.map((post, index) => {
            const rotations = [-2, 1.5, -1, 2, -1.5, 2.5];
            const rot = rotations[index % rotations.length];

            return (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="break-inside-avoid relative p-3 sm:p-4 rounded-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                style={{
                  transform: `rotate(${rot}deg)`,
                }}
              >
                {/* Physical needle pin */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                  <DoodlePin size={24} filled color="var(--ink-primary)" />
                </div>

                {/* Photo frame */}
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-neutral-200 border border-[var(--border-color)] mb-3">
                  <img
                    src={post.image}
                    alt={post.location}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-secondary)] mb-1">
                    <span>{post.city}, {post.country}</span>
                    <span>{post.date}</span>
                  </div>
                  <p className="font-hand text-lg font-bold text-[var(--ink-primary)] leading-tight">
                    &ldquo;{post.caption}&rdquo;
                  </p>
                  <p className="text-[11px] text-[var(--ink-secondary)] mt-1.5 font-sans">
                    Pinned by <span className="font-semibold">{post.author}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Clean Database State: Empty Gallery Notice */
        <div className="w-full max-w-2xl bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--ink-primary)] flex items-center justify-center mb-4 text-[var(--ink-primary)]">
            <InkIcon name="photo" size={26} />
          </div>
          <h3 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
            The photo gallery is a clean canvas
          </h3>
          <p className="text-sm text-[var(--ink-secondary)] max-w-md mt-2 mb-6 leading-relaxed font-sans">
            Snap a photograph on your travels, attach a quick doodle note, and pin it to the whiteboard wall for the community.
          </p>
          {onCreateClick && (
            <button
              onClick={onCreateClick}
              className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>Pin a Photograph</span>
              <InkIcon name="photo" size={14} />
            </button>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-3xl border-2 border-[var(--border-color)] p-6 shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPost(null)}
              aria-label="Close details"
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-[var(--border-color)] flex items-center justify-center text-xs font-bold hover:bg-[var(--bg-secondary)] text-[var(--ink-primary)] cursor-pointer"
            >
              <InkIcon name="close" size={14} />
            </button>

            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-200 border border-[var(--border-color)] mb-4">
              <img
                src={selectedPost.image}
                alt={selectedPost.location}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-secondary)] mb-1">
              <span>{selectedPost.city}, {selectedPost.country}</span>
              <span>·</span>
              <span>{selectedPost.date}</span>
            </div>
            <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
              &ldquo;{selectedPost.caption}&rdquo;
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] mt-2">
              Doodled by{" "}
              {onViewProfile ? (
                <button
                  type="button"
                  onClick={() => {
                    const author = selectedPost.author;
                    setSelectedPost(null);
                    onViewProfile(author);
                  }}
                  className="font-bold text-[var(--ink-primary)] hover:underline cursor-pointer"
                >
                  {selectedPost.author}
                </button>
              ) : (
                <span className="font-bold text-[var(--ink-primary)]">{selectedPost.author}</span>
              )}
            </p>

            <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
              <Link
                href={`/explore?country=${selectedPost.country}&city=${encodeURIComponent(
                  selectedPost.city
                )}`}
                className="text-xs font-semibold text-[var(--ink-primary)] hover:underline flex items-center gap-1"
              >
                <span>View in Explore Atlas</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
