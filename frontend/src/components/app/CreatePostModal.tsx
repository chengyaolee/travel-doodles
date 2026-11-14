"use client";

import { useState, useEffect, useRef } from "react";
import { DoodlePin } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

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
  authorId?: string;
  authorCustomId?: string;
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

export function CreatePostModal({
  isOpen,
  onClose,
  onPublish,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (post: TravelDoodlePost) => void;
}) {
  const { user } = useAuth();

  // Address search and granular location state
  const [searchQuery, setSearchQuery] = useState("Kyoto, Japan");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>({
    id: "init-kyoto",
    name: "Philosopher's Path",
    displayName: "Philosopher's Path, Kyoto, Kyoto Prefecture, Japan",
    city: "Kyoto",
    state: "Kyoto Prefecture",
    country: "Japan",
    countryCode: "JP",
    regionId: "JP-26",
    coordinates: [135.7681, 35.0116],
  });

  // Granular location fields: landmark / address, city, state/region, country
  const [locationName, setLocationName] = useState("Philosopher's Path");
  const [city, setCity] = useState("Kyoto");
  const [state, setState] = useState("Kyoto Prefecture");
  const [country, setCountry] = useState("Japan");
  const [countryCode, setCountryCode] = useState("JP");
  const [regionId, setRegionId] = useState("JP-26");
  const [coordinates, setCoordinates] = useState<[number, number]>([135.7681, 35.0116]);

  const [caption, setCaption] = useState(
    "Watching cherry blossoms flutter over the Philosopher's Path. Green tea warm in hand."
  );
  const [date, setDate] = useState("2026-05-18");
  const [visibility, setVisibility] = useState<"everyone" | "friends" | "private">("everyone");

  // Custom photo upload state
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoFileName, setPhotoFileName] = useState<string>("");
  const [photoFileSize, setPhotoFileSize] = useState<string>("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [rotation, setRotation] = useState(-2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Process custom image file with client-side Canvas optimization
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file (JPEG, PNG, WebP, GIF).");
      return;
    }
    setPhotoError(null);
    setIsProcessingPhoto(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        setIsProcessingPhoto(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setPhotoUrl(compressedDataUrl);
            setPhotoFileName(file.name);
            const kb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
            setPhotoFileSize(`${kb} KB`);
          } else {
            setPhotoUrl(rawDataUrl);
            setPhotoFileName(file.name);
            const kb = Math.round(file.size / 1024);
            setPhotoFileSize(`${kb} KB`);
          }
        } catch (err) {
          console.warn("Canvas compression fallback:", err);
          setPhotoUrl(rawDataUrl);
          setPhotoFileName(file.name);
        } finally {
          setIsProcessingPhoto(false);
        }
      };
      img.onerror = () => {
        setPhotoError("Could not decode image file.");
        setIsProcessingPhoto(false);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setPhotoError("Could not read image file.");
      setIsProcessingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    setSelectedLocation(item);
    setLocationName(item.name || "");
    setCity(item.city || item.name || "");
    setState(item.state || "");
    setCountry(item.country || item.countryCode || "");
    setCountryCode(item.countryCode || "");
    if (item.regionId) setRegionId(item.regionId);
    setCoordinates(item.coordinates);
    setSearchQuery(item.displayName || `${item.name}, ${item.country}`);
    setShowDropdown(false);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPhotoUrl(urlInput.trim());
    setPhotoFileName("Web Photo");
    setPhotoFileSize("Remote URL");
    setPhotoError(null);
    setShowUrlInput(false);
    setUrlInput("");
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    setPhotoFileName("");
    setPhotoFileSize("");
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) {
      setPhotoError("Please upload a photo for your doodle memory.");
      return;
    }

    setIsSubmitting(true);

    const authorName = user?.display_name || user?.username || "Traveler";
    const authorAvatar = user?.avatar_url || "";

    // Build granular location string with landmark/address, city, state, country
    const locationParts = [
      locationName.trim(),
      city.trim(),
      state.trim(),
      country.trim(),
    ].filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);

    const fullGranularLocation = locationParts.join(", ") || `${city}, ${country}`;

    const postPayload = {
      city: city.trim() || locationName.trim(),
      country: countryCode.trim() || country.trim(),
      region: regionId || state.trim(),
      location: fullGranularLocation,
      caption,
      date,
      visibility,
      image: photoUrl,
      coordinates,
      author: authorName,
      avatar: authorAvatar,
    };

    try {
      const serverPost = await api.createPost(postPayload);

      const newPost: TravelDoodlePost = {
        id: serverPost.id,
        location: serverPost.location || fullGranularLocation,
        city: serverPost.city,
        country: serverPost.country,
        region: serverPost.region,
        caption: serverPost.caption,
        date: serverPost.date,
        visibility: serverPost.visibility,
        image: serverPost.image || photoUrl,
        author: serverPost.author,
        authorId: serverPost.authorId || user?.id,
        authorCustomId: serverPost.authorCustomId || user?.custom_id,
        avatar: serverPost.avatar,
        likes: serverPost.likes,
        coordinates: serverPost.coordinates || coordinates,
      };

      onPublish(newPost);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to publish doodle to backend:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to publish doodle memory. Please try again.";
      setPhotoError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Subtitle for Polaroid: combines city (if different from landmark), state, and country
  const polaroidSubtitleParts = [
    locationName.trim() && city.trim() && city.trim() !== locationName.trim() ? city.trim() : "",
    state.trim(),
    country.trim(),
  ].filter(Boolean);
  const polaroidSubtitle = polaroidSubtitleParts.join(", ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[20dvh] sm:pt-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
        >
          <InkIcon name="close" size={16} />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]"><InkIcon name="pen" size={24} /></span>
            <h2 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
              Create a Doodle Memory
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-secondary)] mt-1 font-sans">
            Upload your travel photo and pin your memory with granular landmark, address, and state details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Autocomplete Search */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1 uppercase tracking-wider">
                Quick Search Address, Landmark, or City
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 text-stone-400 pointer-events-none">
                  <InkIcon name="search" size={15} />
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
                  placeholder="Search landmark, address, city or state (e.g. Philosopher's Path, Austin, Eiffel Tower)..."
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--ink-primary)] focus:outline-hidden focus:border-[#d94e34] transition-colors"
                />
                {isSearching && (
                  <div className="absolute right-3 top-3">
                    <div className="w-3.5 h-3.5 border-2 border-[#d94e34] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Autocomplete Dropdown List with State included */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-[var(--border-color)]">
                  {suggestions.map((item) => {
                    const subtitleParts = [
                      item.city && item.city !== item.name ? item.city : "",
                      item.state,
                      item.country,
                    ].filter(Boolean);
                    const subLabel = subtitleParts.join(", ");

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-[var(--bg-secondary)] transition-colors flex items-start gap-2.5 cursor-pointer"
                      >
                        <div className="mt-0.5 shrink-0 text-[#d94e34]">
                          <DoodlePin size={14} color="#d94e34" filled />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[var(--ink-primary)] truncate">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[var(--ink-secondary)] truncate">
                            {subLabel || item.displayName}
                          </div>
                        </div>
                        <div className="shrink-0 text-[10px] font-mono text-[var(--ink-secondary)]">
                          {item.coordinates[1].toFixed(2)}°, {item.coordinates[0].toFixed(2)}°
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Granular Location Details Fields */}
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--ink-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <InkIcon name="pin" size={13} />
                  Granular Location Details
                </span>
                <span className="text-[10px] font-mono text-[var(--ink-secondary)]">
                  GPS: [{coordinates[1].toFixed(4)}°, {coordinates[0].toFixed(4)}°]
                </span>
              </div>

              {/* Landmark / Street Address */}
              <div>
                <label className="block text-[11px] font-medium text-[var(--ink-secondary)] mb-1">
                  Landmark, Place Name, or Street Address
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                  placeholder="e.g. Philosopher's Path, Barton Springs, 100 Main St"
                  className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)] focus:outline-hidden focus:border-[#d94e34]"
                />
              </div>

              {/* City, State / Province, Country Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--ink-secondary)] mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="e.g. Kyoto, Austin"
                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)] focus:outline-hidden focus:border-[#d94e34]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--ink-secondary)] mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Kyoto Prefecture, Texas"
                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)] focus:outline-hidden focus:border-[#d94e34]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--ink-secondary)] mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                    placeholder="e.g. Japan, United States"
                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)] focus:outline-hidden focus:border-[#d94e34]"
                  />
                </div>
              </div>
            </div>

            {/* Custom Photo Upload Section (No sample placeholder templates) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--ink-secondary)] uppercase tracking-wider">
                  Upload Custom Photo
                </label>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] text-[var(--accent)] hover:underline cursor-pointer"
                >
                  {showUrlInput ? "Hide URL input" : "Or paste image URL"}
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Web URL input fallback if requested */}
              {showUrlInput && (
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/your-photo.jpg"
                    className="flex-1 px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:bg-[var(--border-color)] text-[var(--ink-primary)]"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Upload Drop Zone or Photo Preview */}
              {!photoUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-[#d94e34] bg-[#d94e34]/5 scale-[1.01]"
                      : "border-[var(--border-color)] hover:border-[#d94e34] bg-[var(--bg-secondary)]"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)] shadow-xs">
                      <InkIcon name="photo" size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--ink-primary)]">
                        {isProcessingPhoto ? "Optimizing photo..." : "Click to browse or drag & drop photo"}
                      </div>
                      <div className="text-[11px] text-[var(--ink-secondary)] mt-0.5">
                        Supports JPEG, PNG, WebP from your device
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={photoUrl}
                      alt="Uploaded preview"
                      className="w-12 h-12 rounded-lg object-cover border border-[var(--border-color)] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--ink-primary)] truncate">
                        {photoFileName || "Custom Travel Photo"}
                      </div>
                      <div className="text-[10px] text-[var(--ink-secondary)]">
                        {photoFileSize || "Ready to pin"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--ink-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="p-1 rounded-lg text-stone-400 hover:text-red-500 hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
                      title="Remove photo"
                      aria-label="Remove photo"
                    >
                      <InkIcon name="close" size={15} />
                    </button>
                  </div>
                </div>
              )}

              {photoError && (
                <p className="text-xs text-red-500 mt-1 font-medium">{photoError}</p>
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

            {/* Handwritten Story / Caption */}
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
                disabled={isSubmitting || isProcessingPhoto}
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

          {/* Right Column: Live Polaroid Preview with Granular Location */}
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

              {/* Photo Image or Empty Placeholder */}
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 rounded-2xs flex items-center justify-center border border-neutral-200">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={locationName || city}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center">
                    <div className="text-neutral-400">
                      <InkIcon name="photo" size={24} />
                    </div>
                    <span className="text-[11px] font-hand text-neutral-500">
                      Upload photo to see polaroid preview
                    </span>
                  </div>
                )}
              </div>

              {/* Handwritten Note Area */}
              <div className="mt-3 px-1">
                {/* Granular Landmark / Address */}
                <div className="flex items-center gap-1.5 text-xs text-neutral-900 font-bold truncate">
                  <DoodlePin size={13} color="#d94e34" filled />
                  <span className="truncate">{locationName.trim() || city.trim() || "Travel Memory"}</span>
                </div>

                {/* Subtitle with State & Country */}
                {polaroidSubtitle && (
                  <div className="text-[11px] text-neutral-500 font-medium truncate mt-0.5 pl-4">
                    {polaroidSubtitle}
                  </div>
                )}

                <p className="font-hand text-sm text-neutral-700 mt-2 leading-snug break-words">
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
