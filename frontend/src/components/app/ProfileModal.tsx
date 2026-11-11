"use client";

import { useState } from "react";
import { DoodlePin, DoodleStar, DoodleGlobe, DoodleCompass } from "@/components/doodles";
import { TravelDoodlePost } from "./CreatePostModal";
import { WORLD_LAND_PATH } from "@/lib/worldMapData";

export function ProfileModal({
  isOpen,
  onClose,
  userPosts = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  userPosts?: TravelDoodlePost[];
}) {
  const [tab, setTab] = useState<"board" | "photos" | "routes">("board");
  const [isFollowing, setIsFollowing] = useState(false);

  if (!isOpen) return null;

  const defaultUserPhotos = [
    { src: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=400&fit=crop", loc: "Paris, France" },
    { src: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=400&fit=crop", loc: "New York, USA" },
    { src: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=400&fit=crop", loc: "Tokyo, Japan" },
    { src: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=400&fit=crop", loc: "Sydney, Australia" },
    ...userPosts.map((p) => ({ src: p.image, loc: p.location })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] cursor-pointer"
        >
          ✕
        </button>

        {/* Profile Board Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[var(--border-color)]">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=face"
              alt="Alex Morgan"
              className="w-24 h-24 rounded-full object-cover border-2 border-[var(--ink-primary)] shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 text-sm bg-[var(--bg-primary)] rounded-full p-1 border border-[var(--border-color)] shadow-xs">
              🎨
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
                Alex Morgan
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-secondary)]">
                @alexdoodles
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-2 max-w-lg leading-relaxed">
              Illustrator & backpacker. Drawing one small coffee shop, mountain pass, or train station from every country I step foot in.
            </p>
          </div>

          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-5 py-2 text-sm font-medium rounded-xl border transition-all cursor-pointer ${
              isFollowing
                ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] border-[var(--border-color)]"
                : "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-transparent hover:opacity-90"
            }`}
          >
            {isFollowing ? "Following ✓" : "Follow Explorer"}
          </button>
        </div>

        {/* Minimal Stats */}
        <div className="grid grid-cols-4 gap-3 my-6">
          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
            <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">18</span>
            <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">Countries</span>
          </div>
          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
            <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
              {defaultUserPhotos.length}
            </span>
            <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">Memories</span>
          </div>
          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
            <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">1.8k</span>
            <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">Followers</span>
          </div>
          <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
            <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">4</span>
            <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">Routes</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 border-b border-[var(--border-color)] pb-3 mb-6">
          {(["board", "photos", "routes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-hand text-sm rounded-lg capitalize transition-colors ${
                tab === t
                  ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] font-bold"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)]"
              }`}
            >
              {t === "board" ? "Doodle Board Map" : t === "photos" ? "Pinned Polaroids" : "Journey Log"}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "board" && (
          <div className="relative aspect-[1000/560] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 1000 560" fill="none">
              <path
                d={WORLD_LAND_PATH}
                stroke="var(--stroke-color)"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                fill="var(--bg-elevated)"
                opacity="0.7"
              />
              {/* Flight corridors */}
              <path d="M 312.7 222 Q 410 160 506 192.9" stroke="var(--ink-primary)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
              <path d="M 506 192.9 Q 700 130 853.5 238.2" stroke="var(--ink-primary)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
              <path d="M 853.5 238.2 Q 860 330 882.7 426.2" stroke="var(--ink-primary)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />
              {/* City markers with rings */}
              <g>
                <circle cx="312.7" cy="222" r="5" fill="var(--ink-primary)" />
                <circle cx="312.7" cy="222" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
              </g>
              <g>
                <circle cx="506" cy="192.9" r="5" fill="var(--ink-primary)" />
                <circle cx="506" cy="192.9" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
              </g>
              <g>
                <circle cx="853.5" cy="238.2" r="5" fill="var(--ink-primary)" />
                <circle cx="853.5" cy="238.2" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
              </g>
              <g>
                <circle cx="882.7" cy="426.2" r="5" fill="var(--ink-primary)" />
                <circle cx="882.7" cy="426.2" r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
              </g>
            </svg>
            <div className="absolute bottom-4 left-4 font-hand text-xs text-[var(--ink-secondary)] bg-[var(--bg-primary)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">
              📍 4 active travel corridors pinned
            </div>
          </div>
        )}

        {tab === "photos" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {defaultUserPhotos.map((item, i) => (
              <div
                key={i}
                className="bg-white p-2 pb-6 rounded-xs shadow-md border border-neutral-200 transition-transform hover:-translate-y-1 hover:shadow-lg"
                style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 2}deg)` }}
              >
                <div className="aspect-square overflow-hidden bg-neutral-100 rounded-2xs mb-2">
                  <img src={item.src} alt={item.loc} className="w-full h-full object-cover" />
                </div>
                <p className="font-hand text-xs text-neutral-800 text-center truncate">{item.loc}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "routes" && (
          <div className="space-y-3">
            {[
              { title: "Trans-Pacific Route", desc: "San Francisco → Tokyo → Kyoto → Osaka", date: "April 2026" },
              { title: "Mediterranean Loop", desc: "Barcelona → Marseille → Florence → Rome", date: "September 2025" },
              { title: "Nordic Explorer", desc: "Oslo → Bergen → Flåm → Geiranger", date: "June 2025" },
            ].map((route, i) => (
              <div key={i} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">{route.title}</h4>
                  <p className="text-xs text-[var(--ink-secondary)] font-mono mt-0.5">{route.desc}</p>
                </div>
                <span className="font-hand text-xs text-[var(--ink-secondary)]">{route.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
