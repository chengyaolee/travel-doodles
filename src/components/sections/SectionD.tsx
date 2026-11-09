"use client";

import { useRef, useState, useEffect } from "react";
import { DoodleUnderline, DoodlePin } from "@/components/doodles";

const GALLERY_POSTS = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=450&fit=crop",
    location: "Baa Atoll, Maldives",
    region: "Islands",
    author: "Elena Rostova",
    caption: "Manta rays gliding beneath the stilt villas. Pure turquoise quiet.",
    rotation: -2,
    aspect: "aspect-[4/3]",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&h=750&fit=crop",
    location: "Zermatt, Swiss Alps",
    region: "Europe",
    author: "Lukas Weber",
    caption: "First snow on the Matterhorn. Crisp mountain air and hot fondue.",
    rotation: 2,
    aspect: "aspect-[3/4]",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&h=500&fit=crop",
    location: "Yosemite Valley, USA",
    region: "Americas",
    author: "Maya Chen",
    caption: "El Capitan at sunset, watching climbers like tiny stars on the granite face.",
    rotation: -1.5,
    aspect: "aspect-[4/3]",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=600&h=600&fit=crop",
    location: "Oia, Santorini",
    region: "Europe",
    author: "Dimitri V.",
    caption: "Whitewashed rooftops meeting the deep Aegean blue. Windmills turning slowly.",
    rotation: 2.5,
    aspect: "aspect-square",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=600&h=450&fit=crop",
    location: "Ubud, Bali",
    region: "Asia",
    author: "Aria Thorne",
    caption: "Morning fog rising over the Tegallalang rice terraces. Smells like rain and frangipani.",
    rotation: -2,
    aspect: "aspect-[4/3]",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=700&fit=crop",
    location: "Torres del Paine, Patagonia",
    region: "Americas",
    author: "Gabriel Silva",
    caption: "Glacial lakes that look neon cyan against the jagged granite horns.",
    rotation: 1.5,
    aspect: "aspect-[3/4]",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=600&h=500&fit=crop",
    location: "Vik, Iceland",
    region: "Europe",
    author: "Sigrid Hall",
    caption: "Black sand beaches and basalt columns while North Atlantic waves crash.",
    rotation: -2.5,
    aspect: "aspect-[4/3]",
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&h=600&fit=crop",
    location: "Positano, Amalfi Coast",
    region: "Europe",
    author: "Matteo Bianchi",
    caption: "Pastel houses tumbling down cliffs toward the Mediterranean sun.",
    rotation: 2,
    aspect: "aspect-square",
  },
];

export function SectionD() {
  const [selectedPost, setSelectedPost] = useState<(typeof GALLERY_POSTS)[0] | null>(null);
  const [filter, setFilter] = useState("all");
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

  const filteredItems = filter === "all"
    ? GALLERY_POSTS
    : GALLERY_POSTS.filter((p) => p.region.toLowerCase() === filter.toLowerCase());

  return (
    <section ref={sectionRef} id="gallery" className="py-24 md:py-32 px-4 sm:px-6 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto w-full flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="section-kicker mb-5">
            Notes from everywhere
          </div>
          <h2
            className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-[-0.05em] leading-[1.1] text-[var(--ink-primary)]"
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
                <DoodleUnderline width={175} animate={isVisible} delay={500} />
              </span>
            </span>
          </h2>
          <p
            className="text-[var(--ink-secondary)] text-base sm:text-lg mt-4 max-w-lg mx-auto font-normal"
            style={{ opacity: isVisible ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}
          >
            Explore real traveler snapshots framed like physical prints, scattered organically across our shared world.
          </p>

          {/* Destination tag filter */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {["all", "Europe", "Asia", "Americas", "Islands"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer border ${
                  filter.toLowerCase() === f.toLowerCase()
                    ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)] font-bold"
                    : "bg-[var(--bg-primary)] text-[var(--ink-secondary)] border-[var(--border-color)] hover:border-[var(--ink-primary)]"
                }`}
              >
                #{f}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Irregular Masonry Columns (Without space-y-6 collapse bug) */}
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
          {filteredItems.map((post, i) => (
            <div
              key={post.id}
              className="break-inside-avoid mb-6 group cursor-pointer p-2 -m-2 select-none"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible
                  ? `rotate(${post.rotation}deg)`
                  : `rotate(${post.rotation}deg) translateY(30px)`,
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + i * 0.06}s`,
              }}
              onClick={() => setSelectedPost(post)}
            >
              <div className="bg-white p-3 pb-8 rounded-xs shadow-md transition-all duration-200 group-hover:shadow-2xl group-hover:scale-[1.01] relative border border-neutral-200 group-hover:border-neutral-400">
                {/* Wobbly tape overlay */}
                <div
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-4.5 bg-neutral-200/90 rounded-2xs shadow-2xs z-10"
                  style={{ transform: `translateX(-50%) rotate(${-post.rotation * 0.8}deg)` }}
                />

                <div className={`overflow-hidden rounded-2xs bg-neutral-100 ${post.aspect}`}>
                  <img
                    src={post.src}
                    alt={post.location}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                <div className="mt-3 px-1">
                  <div className="flex items-center gap-1 text-xs text-neutral-800 font-bold truncate">
                    <DoodlePin size={13} color="#181818" />
                    <span>{post.location}</span>
                  </div>
                  <p className="font-hand text-sm text-neutral-600 mt-1 line-clamp-2 leading-tight">
                    &ldquo;{post.caption}&rdquo;
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-2 font-mono">
                    doodled by {post.author}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for Post Detail */}
        {selectedPost && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in-up"
            onClick={() => setSelectedPost(null)}
          >
            <div
              className="relative max-w-lg w-full bg-[var(--bg-primary)] rounded-3xl border-2 border-[var(--border-color)] overflow-hidden shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
              >
                ✕
              </button>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[var(--bg-elevated)] mb-4">
                <img
                  src={selectedPost.src}
                  alt={selectedPost.location}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <DoodlePin size={18} filled />
                <h3 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                  {selectedPost.location}
                </h3>
              </div>
              <p className="text-sm text-[var(--ink-secondary)] mb-4 leading-relaxed font-sans font-normal">
                {selectedPost.caption}
              </p>
              <div className="flex items-center justify-between text-xs text-[var(--ink-secondary)] border-t border-[var(--border-color)] pt-3 font-mono">
                <span>By {selectedPost.author}</span>
                <span className="font-hand text-sm text-[var(--ink-primary)]">#traveldoodles</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
