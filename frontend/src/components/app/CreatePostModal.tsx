"use client";

import { useState, useEffect, useRef } from "react";
import { DoodlePin } from "@/components/doodles";
import { api } from "@/lib/api";

export interface TravelDoodlePost {
  id: string;
  location: string;
  city: string;
  country: string;
  region?: string;
  caption: string;
  date: string;
  visibility: "everyone" | "friends" | "private";
  image: string;
  doodleSticker?: string;
  author: string;
  avatar: string;
  likes: number;
  coordinates?: [number, number];
}

interface LocationSuggestion {
  id: string;
  name: string;
  displayName: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  regionId?: string;
  coordinates: [number, number];
}

const PRESET_PHOTOS = [
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=380&fit=crop",
  "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=500&h=380&fit=crop",
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&h=380&fit=crop",
  "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=500&h=380&fit=crop",
];

export function CreatePostModal({
  isOpen,
  onClose,
  onPublish,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (post: TravelDoodlePost) => void;
}) {
  // Address autocomplete state
  const [searchQuery, setSearchQuery] = useState("Kyoto, Japan");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>({
    id: "init-kyoto",
    name: "Kyoto",
    displayName: "Kyoto, Japan",
    city: "Kyoto",
    country: "Japan",
    countryCode: "JP",
    regionId: "JP-26",
    coordinates: [135.7681, 35.0116],
  });

  const [city, setCity] = useState("Kyoto");
  const [country, setCountry] = useState("Japan");
  const [countryCode, setCountryCode] = useState("JP");
  const [regionId, setRegionId] = useState("JP-26");
  const [coordinates, setCoordinates] = useState<[number, number]>([135.7681, 35.0116]);

  const [caption, setCaption] = useState(
    "Watching cherry blossoms flutter over the Philosopher's Path. Green tea warm in hand."
  );
  const [date, setDate] = useState("2026-05-18");
  const [visibility, setVisibility] = useState<"everyone" | "friends" | "private">("everyone");
  const [selectedPhoto, setSelectedPhoto] = useState(PRESET_PHOTOS[0]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState("");
  const [rotation, setRotation] = useState(-2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Address search query debouncing
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/v1/geo/autocomplete?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.results)) {
            setSuggestions(data.results);
            setShowDropdown(data.results.length > 0);
          }
        })
        .catch((err) => {
          console.warn("Location autocomplete notice:", err);
          setSuggestions([]);
        })
        .finally(() => setIsSearching(false));
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const currentPhoto = customPhotoUrl.trim() || selectedPhoto;

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setSelectedLocation(item);
    setCity(item.city || item.name);
    setCountry(item.country || item.countryCode);
    setCountryCode(item.countryCode || item.country);
    if (item.regionId) setRegionId(item.regionId);
    setCoordinates(item.coordinates);
    setSearchQuery(item.displayName || `${item.name}, ${item.country}`);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const postPayload = {
      city,
      country: countryCode || country,
      region: regionId,
      location: selectedLocation?.displayName || `${city}, ${country}`,
      caption,
      date,
      visibility,
      image: currentPhoto,
      coordinates,
      author: "You (Explorer)",
    };

    try {
      const serverPost = await api.createPost(postPayload);

      const newPost: TravelDoodlePost = {
        id: serverPost.id,
        location: serverPost.location || `${serverPost.city}, ${serverPost.country}`,
        city: serverPost.city,
        country: serverPost.country,
        region: serverPost.region,
        caption: serverPost.caption,
        date: serverPost.date,
        visibility: serverPost.visibility,
        image: serverPost.image || currentPhoto,
        author: serverPost.author,
        avatar: serverPost.avatar,
        likes: serverPost.likes,
        coordinates: serverPost.coordinates || coordinates,
      };

      onPublish(newPost);
    } catch (err) {
      console.warn("Backend create fallback to local state:", err);
      const fallbackPost: TravelDoodlePost = {
        id: "post-" + Date.now(),
        location: `${city}, ${country}`,
        city,
        country: countryCode || country,
        region: regionId,
        caption,
        date,
        visibility,
        image: currentPhoto,
        author: "You (Explorer)",
        avatar:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
        likes: 1,
        coordinates,
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
          aria-label="Close"
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
            Pin your travel photo, caption, and memory onto the global map canvas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Location Autocomplete (Requirement 3: Points to actual location on the map with free autocomplete) */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1 uppercase tracking-wider">
                Location & Map Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  required
                  placeholder="Search address, landmark, or city (e.g. Kyoto, Eiffel Tower, Times Square)..."
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[#d94e34] transition-colors"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="w-3.5 h-3.5 border-2 border-[#d94e34] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Autocomplete Dropdown List */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-[var(--border-color)]">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-[var(--bg-secondary)] transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <div className="mt-0.5 shrink-0 text-[#d94e34]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[var(--ink-primary)] truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-[var(--ink-secondary)] truncate">
                          {item.displayName}
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] font-mono text-[var(--ink-secondary)]">
                        {item.coordinates[1].toFixed(2)}°, {item.coordinates[0].toFixed(2)}°
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Confirmed Location Coordinates Indicator */}
              {selectedLocation && (
                <div className="mt-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-[#d94e34]" />
                    <span className="font-semibold text-[var(--ink-primary)] truncate">
                      {city}, {country}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--ink-secondary)]">
                    GPS: [{coordinates[1].toFixed(4)}°, {coordinates[0].toFixed(4)}°]
                  </span>
                </div>
              )}
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
                        ? "border-[#d94e34] scale-105"
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

            {/* Polaroid Tilt Angle */}
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
                className="w-full accent-[#d94e34]"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-6 rounded-xl bg-[#d94e34] hover:bg-[#b91c1c] text-white font-bold text-sm active:scale-95 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSubmitting ? "Pinning to Map..." : "Publish to World Map"}
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

          {/* Right Column: Live Polaroid Preview (No sticker stamps or emojis) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)]">
            <span className="text-xs font-hand text-[var(--ink-secondary)] uppercase tracking-wider mb-4">
              Live Polaroid Preview
            </span>

            {/* Physical Polaroid mockup */}
            <div
              className="relative w-full max-w-[280px] bg-white p-3.5 pb-8 rounded-sm shadow-xl border border-neutral-200 transition-transform duration-200"
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
              </div>

              {/* Handwritten Note Area */}
              <div className="mt-3 px-1">
                <div className="flex items-center gap-1.5 text-xs text-neutral-900 font-bold truncate">
                  <DoodlePin size={13} color="#d94e34" filled />
                  <span className="truncate">{city}, {country}</span>
                </div>
                <p className="font-hand text-sm text-neutral-700 mt-1.5 leading-snug break-words">
                  &ldquo;{caption || "Your travel memory..."}&rdquo;
                </p>
                <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>{date}</span>
                  <span>{coordinates[1].toFixed(2)}°, {coordinates[0].toFixed(2)}°</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] font-hand text-[var(--ink-secondary)] text-center mt-6">
              Will be pinned to exact GPS coordinates on the atlas!
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
