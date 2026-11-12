"use client";

import { useState } from "react";
import { DoodlePin } from "@/components/doodles";
import { TravelDoodlePost } from "./CreatePostModal";
import { WORLD_LAND_PATH, ACCURATE_CITIES } from "@/lib/worldMapData";
import { useAuth } from "@/lib/authContext";

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
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  if (!isOpen) return null;

  // Filter posts created by the current user
  const myPosts = user
    ? userPosts.filter(
        (p) =>
          p.author === user.display_name ||
          p.author === user.username ||
          p.author === user.custom_id
      )
    : [];

  const userPhotos = myPosts
    .filter((p) => Boolean(p.image))
    .map((p) => ({ src: p.image, loc: p.location || `${p.city}, ${p.country}` }));

  const uniqueCountries = new Set(myPosts.map((p) => p.country).filter(Boolean)).size;

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

        {isAuthenticated && user ? (
          <>
            {/* Profile Board Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[var(--border-color)]">
              <div className="relative">
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[var(--ink-primary)] shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 text-sm bg-[var(--bg-primary)] rounded-full p-1 border border-[var(--border-color)] shadow-xs">
                  🎨
                </span>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h2 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
                    {user.display_name}
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-secondary)]">
                    @{user.custom_id}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-2 max-w-lg leading-relaxed">
                  {user.bio}
                </p>
              </div>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              >
                Log Out
              </button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {uniqueCountries}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  Countries
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {myPosts.length}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  Memories
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {userPhotos.length}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  Photographs
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {uniqueCountries > 1 ? 1 : 0}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  Journeys
                </span>
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
                  {t === "board"
                    ? "Doodle Board Map"
                    : t === "photos"
                    ? "Pinned Polaroids"
                    : "Journey Log"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
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
                  {myPosts.map((post) => {
                    let cx = 500;
                    let cy = 280;
                    const cityKey = (post.city || "").toLowerCase().trim();
                    if (ACCURATE_CITIES[cityKey as keyof typeof ACCURATE_CITIES]) {
                      cx = ACCURATE_CITIES[cityKey as keyof typeof ACCURATE_CITIES].x;
                      cy = ACCURATE_CITIES[cityKey as keyof typeof ACCURATE_CITIES].y;
                    } else if (post.coordinates && post.coordinates.length >= 2) {
                      const lng = post.coordinates[0];
                      const lat = Math.max(-80, Math.min(84, post.coordinates[1]));
                      cx = ((lng + 180) / 360) * 1000;
                      cy = 280 - (lat / 90) * 230;
                    }
                    return (
                      <g key={post.id}>
                        <circle cx={cx} cy={cy} r="5" fill="var(--ink-primary)" />
                        <circle cx={cx} cy={cy} r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-4 left-4 font-hand text-xs text-[var(--ink-secondary)] bg-[var(--bg-primary)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                  📍 {myPosts.length} pinned memories on your board
                </div>
              </div>
            )}

            {tab === "photos" && (
              userPhotos.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6">
                  <span className="text-3xl mb-2">📷</span>
                  <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                    No Polaroids Pinned Yet
                  </h4>
                  <p className="text-xs text-[var(--ink-secondary)] max-w-xs mt-1 font-mono">
                    Capture memories with photos to build your visual travel wall!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {userPhotos.map((item, i) => (
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
              )
            )}

            {tab === "routes" && (
              myPosts.length === 0 ? (
                <div className="py-12 text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6">
                  <p className="text-xs text-[var(--ink-secondary)]">No journeys recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                    <div>
                      <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                        Your Personal Route
                      </h4>
                      <p className="text-xs text-[var(--ink-secondary)] font-mono mt-0.5">
                        {myPosts.map((p) => p.city).join(" → ")}
                      </p>
                    </div>
                    <span className="font-hand text-xs text-[var(--ink-secondary)]">
                      {myPosts.length} stops
                    </span>
                  </div>
                </div>
              )
            )}
          </>
        ) : (
          /* Guest State: Prompt Account Creation / Login */
          <div className="py-12 px-6 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[var(--ink-primary)] flex items-center justify-center text-3xl mb-4">
              🎒
            </div>
            <h3 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
              Your personal travel board
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] max-w-sm mt-2 mb-6 leading-relaxed font-sans">
              Sign in or create a traveler account to view your pinned memories, recorded countries, and personal sketchbook.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onClose();
                  openAuthModal("open your traveler board");
                }}
                className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-md cursor-pointer"
              >
                Log In or Join 🎒
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
