"use client";

import { useState } from "react";
import { DoodlePin, DoodleStar, DoodleUnderline } from "@/components/doodles";
import { api } from "@/lib/api";

export interface TravelDoodlePost {
  id: string;
  location: string;
  city: string;
  country: string;
  caption: string;
  date: string;
  visibility: "everyone" | "friends" | "private";
  image: string;
  doodleSticker: string;
  author: string;
  avatar: string;
  likes: number;
}

const PRESET_PHOTOS = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=380&fit=crop",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=500&h=380&fit=crop",
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&h=380&fit=crop",
  "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=500&h=380&fit=crop",
];

const STICKERS = ["✈️", "☕", "📸", "⛰️", "🌊", "🥐", "🏕️", "🎒"];

export function CreatePostModal({
  isOpen,
  onClose,
  onPublish,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (post: TravelDoodlePost) => void;
}) {
  const [city, setCity] = useState("Kyoto");
  const [country, setCountry] = useState("Japan");
  const [caption, setCaption] = useState("Watching cherry blossoms flutter over the Philosopher's Path. Green tea warm in hand.");
  const [date, setDate] = useState("2026-05-18");
  const [visibility, setVisibility] = useState<"everyone" | "friends" | "private">("everyone");
  const [selectedPhoto, setSelectedPhoto] = useState(PRESET_PHOTOS[0]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [selectedSticker, setSelectedSticker] = useState("🌸");
  const [rotation, setRotation] = useState(-2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentPhoto = customPhotoUrl.trim() || selectedPhoto;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Connect to real backend API
      const serverPost = await api.createPost({
        city,
        country,
        caption,
        date,
        visibility,
        image: currentPhoto,
        doodleSticker: selectedSticker,
        author: "You (Explorer)",
      });

      const newPost: TravelDoodlePost = {
        id: serverPost.id,
        location: `${serverPost.city}, ${serverPost.country}`,
        city: serverPost.city,
        country: serverPost.country,
        caption: serverPost.caption,
        date: serverPost.date,
        visibility: serverPost.visibility,
        image: serverPost.image || currentPhoto,
        doodleSticker: serverPost.doodleSticker,
        author: serverPost.author,
        avatar: serverPost.avatar,
        likes: serverPost.likes,
      };

      onPublish(newPost);
    } catch (err) {
      console.warn("Backend create fallback to local state:", err);
      const fallbackPost: TravelDoodlePost = {
        id: "post-" + Date.now(),
        location: `${city}, ${country}`,
        city,
        country,
        caption,
        date,
        visibility,
        image: currentPhoto,
        doodleSticker: selectedSticker,
        author: "You (Explorer)",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
        likes: 1,
      };
      onPublish(fallbackPost);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <h2 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
              Create a Doodle Memory
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-secondary)] mt-1 font-sans">
            Pin your travel photo, caption, and hand-drawn stickers onto the global whiteboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1 uppercase tracking-wider">
                  City / Spot
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-[var(--ink-secondary)]">📍</span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="e.g. Kyoto"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1 uppercase tracking-wider">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  placeholder="e.g. Japan"
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
                />
              </div>
            </div>

            {/* Travel Date & Visibility */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1 uppercase tracking-wider">
                  Travel Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1 uppercase tracking-wider">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
                >
                  <option value="everyone">Public (Everyone)</option>
                  <option value="friends">Friends Only</option>
                  <option value="private">Only Me (Private Board)</option>
                </select>
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1 uppercase tracking-wider">
                Handwritten Story / Note
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                required
                rows={3}
                placeholder="What felt unforgettable about this moment?"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)] font-hand text-base"
              />
            </div>

            {/* Photo Selection */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5 uppercase tracking-wider">
                Choose or Paste Photo
              </label>
              <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                {PRESET_PHOTOS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedPhoto(p);
                      setCustomPhotoUrl("");
                    }}
                    className={`relative w-14 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      selectedPhoto === p && !customPhotoUrl
                        ? "border-[var(--ink-primary)] scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={p} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <input
                type="url"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="Or paste any image URL..."
                className="w-full px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)]"
              />
            </div>

            {/* Doodle Sticker Selector */}
            <div>
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1.5 uppercase tracking-wider">
                Doodle Sticker Stamp
              </label>
              <div className="flex flex-wrap gap-2">
                {STICKERS.map((stk) => (
                  <button
                    key={stk}
                    type="button"
                    onClick={() => setSelectedSticker(stk)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-transform ${
                      selectedSticker === stk
                        ? "bg-[var(--ink-primary)] text-white border-[var(--ink-primary)] scale-110"
                        : "bg-[var(--bg-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    {stk}
                  </button>
                ))}
              </div>
            </div>

            {/* Tilt angle */}
            <div>
              <div className="flex justify-between text-xs text-[var(--ink-secondary)] mb-1">
                <span>Polaroid Tilt Angle</span>
                <span className="font-mono">{rotation}°</span>
              </div>
              <input
                type="range"
                min="-6"
                max="6"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full accent-[var(--ink-primary)]"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-bold text-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? "Pinning to Canvas..." : "Publish to World Board 📌"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-xl border border-[var(--border-color)] text-[var(--ink-secondary)] font-medium text-sm hover:bg-[var(--bg-elevated)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Right Column: Live Polaroid Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)]">
            <span className="text-xs font-hand text-[var(--ink-secondary)] uppercase tracking-wider mb-4">
              Live Whiteboard Preview
            </span>

            {/* Physical Polaroid mockup */}
            <div
              className="relative w-full max-w-[280px] bg-white p-3.5 pb-10 rounded-xs shadow-xl border border-neutral-200 transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {/* Sketched Tape */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-neutral-200/90 rounded-2xs shadow-2xs z-20" />

              {/* Photo Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 rounded-2xs">
                <img
                  src={currentPhoto}
                  alt={city}
                  className="w-full h-full object-cover"
                />
                {/* Sticker badge */}
                <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-sm border border-neutral-300">
                  {selectedSticker}
                </div>
              </div>

              {/* Handwritten Note Area */}
              <div className="mt-3 px-1">
                <div className="flex items-center gap-1 text-xs text-neutral-900 font-bold">
                  <DoodlePin size={14} color="#181818" filled />
                  <span>{city}, {country}</span>
                </div>
                <p className="font-hand text-sm text-neutral-700 mt-1.5 leading-snug break-words">
                  &ldquo;{caption || "Your travel memory..."}&rdquo;
                </p>
                <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>{date}</span>
                  <span>#{visibility}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] font-hand text-[var(--ink-secondary)] text-center mt-6">
              Looks like it was pinned right to the digital board!
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
