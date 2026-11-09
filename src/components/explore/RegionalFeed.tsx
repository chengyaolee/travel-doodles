"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExplorePost } from "@/lib/explore/mockPosts";

export interface RegionItem {
  id: string;
  country: string;
  name: string;
  shortName?: string;
  localName: string;
  type: string;
  region: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  postCount: number;
}

interface RegionalFeedProps {
  countryCode: string | null;
  countryName: string;
  regionId: string | null;
  regionName: string;
  regionLocalName?: string;
  regionsList?: RegionItem[];
  onSelectRegion?: (regionId: string) => void;
  cities: Array<{ id: string; name: string }>;
  selectedCity: string | null;
  onSelectCity: (cityId: string | null) => void;
  posts: ExplorePost[];
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onClose: () => void;
  visibilityFilter: "everyone" | "friends";
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  onBackToWorld?: () => void;
  onBackToCountry?: () => void;
}

export function RegionalFeed({
  countryCode,
  countryName,
  regionId,
  regionName,
  regionLocalName,
  regionsList = [],
  onSelectRegion,
  cities,
  selectedCity,
  onSelectCity,
  posts,
  selectedPostId,
  onSelectPost,
  onClose,
  visibilityFilter,
  isLoading = false,
  hasError = false,
  onRetry,
  onBackToWorld,
  onBackToCountry,
}: RegionalFeedProps) {
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");
  const [filterPhotosOnly, setFilterPhotosOnly] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [showAllStates, setShowAllStates] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedPostRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active post into view smoothly without resetting feed scroll
  useEffect(() => {
    if (selectedPostId && selectedPostRef.current) {
      selectedPostRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedPostId]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Filter & sort posts
  const filteredPosts = React.useMemo(() => {
    let list = [...posts];
    if (selectedCity) {
      list = list.filter((p) => p.city.toLowerCase() === selectedCity.toLowerCase());
    }
    if (filterPhotosOnly) {
      list = list.filter((p) => Boolean(p.image && !p.isTextOnly));
    }
    if (sortBy === "popular") {
      list.sort((a, b) => b.likes - a.likes);
    } else {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return list;
  }, [posts, selectedCity, filterPhotosOnly, sortBy]);

  // Filtered states list for search
  const filteredStates = React.useMemo(() => {
    if (!stateSearch.trim()) return regionsList;
    const q = stateSearch.toLowerCase();
    return regionsList.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.localName.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }, [regionsList, stateSearch]);

  const displayedPosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  const handleToggleLike = (postId: string) => {
    setLikedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleShare = (post: ExplorePost) => {
    const url = `${window.location.origin}/explore?country=${post.country}&region=${post.region}&post=${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setToastMessage("Link copied to clipboard! 📋");
    } else {
      setToastMessage("Link ready: " + url);
    }
  };

  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;
    setToastMessage(`Comment added: "${commentText.trim()}"`);
    setCommentText("");
    setActiveCommentPostId(null);
  };

  // Label for administrative division type
  const stateTypeLabel = React.useMemo(() => {
    if (regionsList.length === 0) return "States & Regions";
    const firstType = regionsList[0]?.type || "State";
    if (firstType === "Canton") return "Cantons";
    if (firstType === "Prefecture" || firstType === "Ken") return "Prefectures";
    if (firstType === "Province") return "Provinces";
    if (firstType === "Bundesland" || firstType === "Land") return "Federal States";
    if (firstType === "Autonomous Region") return "Regions";
    return "States & Regions";
  }, [regionsList]);

  return (
    <aside
      className="w-full h-full flex flex-col bg-[var(--bg-primary)] border-l border-[var(--border-color)] shadow-2xl relative z-40 overflow-hidden font-sans select-none"
      aria-label={`Regional feed for ${regionName || countryName}`}
    >
      {/* Toast notification overlay */}
      {toastMessage && (
        <div className="absolute top-16 left-4 right-4 z-50 p-2.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs text-center font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        Showing regional feed for {regionName || countryName}. {filteredPosts.length} stories found.
      </div>

      {/* Sticky Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-md sticky top-0 z-20">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] mb-2 font-mono"
        >
          <button
            onClick={onBackToWorld}
            className="hover:text-[var(--ink-primary)] underline-offset-2 hover:underline cursor-pointer"
          >
            World
          </button>
          <span>›</span>
          <button
            onClick={onBackToCountry}
            className={`hover:text-[var(--ink-primary)] underline-offset-2 hover:underline cursor-pointer ${
              !regionId ? "font-bold text-[var(--ink-primary)]" : ""
            }`}
          >
            {countryName || "Country"}
          </button>
          {regionName && (
            <>
              <span>›</span>
              <span className="font-bold text-[var(--ink-primary)] truncate max-w-[120px]">
                {regionName}
              </span>
            </>
          )}
        </nav>

        {/* Title + Local Name + Close */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg md:text-xl font-bold text-[var(--ink-primary)] leading-tight flex items-center gap-2">
              <span>{regionName || countryName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-[var(--bg-elevated)] text-[var(--ink-secondary)] font-normal">
                {filteredPosts.length} {filteredPosts.length === 1 ? "story" : "stories"}
              </span>
            </h2>
            {regionLocalName && (
              <span className="font-hand text-sm text-[var(--ink-secondary)] mt-0.5">
                {regionLocalName}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="h-8 px-3 text-xs font-medium rounded-lg border border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            aria-label="Close feed drawer"
          >
            <span>Close</span>
            <span>✕</span>
          </button>
        </div>

        {/* Active Region Switcher / Back to all states button */}
        {regionId && (
          <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 text-xs min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#d94e34] shrink-0"></span>
              <span className="font-semibold text-[var(--ink-primary)] truncate">
                {regionName}
              </span>
            </div>
            {onBackToCountry && (
              <button
                onClick={onBackToCountry}
                className="text-[11px] font-mono text-[#d94e34] hover:underline cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ml-2"
              >
                <span>‹ All {stateTypeLabel}</span>
              </button>
            )}
          </div>
        )}

        {/* City Filter Dropdown if available */}
        {cities && cities.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <label
              htmlFor="city-filter"
              className="text-xs text-[var(--ink-secondary)] font-medium shrink-0"
            >
              City:
            </label>
            <select
              id="city-filter"
              value={selectedCity || ""}
              onChange={(e) => onSelectCity(e.target.value || null)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)] cursor-pointer"
            >
              <option value="">All cities in region</option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort & Filter Controls (Uniform h-8 height) */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
          {/* Sort Tabs */}
          <div className="h-8 flex items-center gap-1 bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => setSortBy("recent")}
              className={`h-7 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                sortBy === "recent"
                  ? "bg-[var(--bg-primary)] font-semibold text-[var(--ink-primary)] shadow-xs"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy("popular")}
              className={`h-7 px-3 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                sortBy === "popular"
                  ? "bg-[var(--bg-primary)] font-semibold text-[var(--ink-primary)] shadow-xs"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              Popular
            </button>
          </div>

          {/* Photos only toggle */}
          <button
            onClick={() => setFilterPhotosOnly(!filterPhotosOnly)}
            className={`h-8 px-3 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filterPhotosOnly
                ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)]"
                : "border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] bg-[var(--bg-elevated)]"
            }`}
          >
            <span>📷</span>
            <span>Photos</span>
          </button>
        </div>
      </div>

      {/* Feed Scroll Content */}
      <div ref={feedContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Requirement 3 & 11: Master States & Regions Chunk Directory */}
        {!regionId && regionsList && regionsList.length > 0 && (
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🗺️</span>
                <h3 className="text-xs font-bold text-[var(--ink-primary)] uppercase tracking-wider">
                  {stateTypeLabel} ({regionsList.length})
                </h3>
              </div>
              {regionsList.length > 6 && (
                <button
                  onClick={() => setShowAllStates(!showAllStates)}
                  className="text-[11px] font-mono text-[#d94e34] hover:underline cursor-pointer"
                >
                  {showAllStates ? "Show less" : `View all (${regionsList.length})`}
                </button>
              )}
            </div>

            {/* Quick State Search */}
            {regionsList.length > 6 && (
              <input
                type="text"
                placeholder={`Search ${stateTypeLabel.toLowerCase()}...`}
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--ink-primary)] placeholder-[var(--ink-secondary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)]"
              />
            )}

            {/* State Grid List with Short Form Name support */}
            <div
              className={`grid grid-cols-2 gap-2 ${
                showAllStates || stateSearch.trim()
                  ? "max-h-64 overflow-y-auto pr-1"
                  : "max-h-44 overflow-hidden"
              }`}
            >
              {filteredStates.map((state) => {
                const hasShortForm = Boolean(state.shortName && state.shortName !== state.name);
                return (
                  <button
                    key={state.id}
                    onClick={() => onSelectRegion?.(state.id)}
                    className="p-2.5 min-h-[58px] rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-left transition-all hover:scale-[1.01] cursor-pointer flex flex-col justify-between group shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-1.5 w-full">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {hasShortForm && (
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[#d94e34] shrink-0 leading-tight">
                            {state.shortName}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-[var(--ink-primary)] truncate group-hover:text-[#d94e34]">
                          {state.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-secondary)] text-[var(--ink-secondary)] shrink-0 leading-tight">
                        {state.postCount}
                      </span>
                    </div>
                    {state.localName && state.localName !== state.name && (
                      <span className="text-[10px] font-hand text-[var(--ink-secondary)] truncate mt-1 block">
                        {state.localName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading stories">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] animate-pulse space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--border-color)]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 bg-[var(--border-color)] rounded" />
                    <div className="h-2 w-16 bg-[var(--border-color)] rounded" />
                  </div>
                </div>
                <div className="h-44 w-full bg-[var(--border-color)] rounded-lg" />
                <div className="h-3 w-3/4 bg-[var(--border-color)] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Network / Render Error State */}
        {hasError && (
          <div className="p-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 text-center space-y-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-xs text-red-600 dark:text-red-400">
              Could not load stories for this geographic sector.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-medium cursor-pointer"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Empty State when no stories pinned in area */}
        {!isLoading && !hasError && displayedPosts.length === 0 && (
          <div className="p-8 rounded-2xl border border-dashed border-[var(--border-color)] text-center space-y-3 bg-[var(--bg-secondary)]/50">
            <span className="text-3xl block">📌</span>
            <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
              No pins yet in {regionName || countryName}
            </h4>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed max-w-xs mx-auto">
              Be the first wanderer to sketch a story here! Drop a wobbly pin or invite friends to
              share memories from this corner of the world.
            </p>
          </div>
        )}

        {/* Feed Stories List */}
        {!isLoading &&
          !hasError &&
          displayedPosts.map((post) => {
            const isSelected = post.id === selectedPostId;
            const isLiked = Boolean(likedPosts[post.id]);

            return (
              <article
                key={post.id}
                ref={isSelected ? selectedPostRef : null}
                onClick={() => onSelectPost(post.id)}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer bg-[var(--bg-primary)] space-y-3 ${
                  isSelected
                    ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20 shadow-lg bg-[var(--bg-elevated)]"
                    : "border-[var(--border-color)] hover:border-[var(--ink-secondary)] hover:shadow-md"
                }`}
                aria-label={`Story by ${post.author} in ${post.location}`}
              >
                {/* Author Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.avatar}
                      alt={post.author}
                      className="w-7 h-7 rounded-full object-cover border border-[var(--border-color)]"
                      loading="lazy"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--ink-primary)] leading-tight">
                        {post.author}
                      </span>
                      <span className="text-[10px] text-[var(--ink-secondary)] font-mono">
                        {post.city} · {post.date}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--ink-secondary)] border border-[var(--border-color)]">
                    {post.visibility === "friends" ? "🔒 Friends" : "🌍 Public"}
                  </span>
                </div>

                {/* Photo Story with Polaroid Frame & Doodle Sticker */}
                {post.image && !post.isTextOnly && (
                  <div className="relative w-full rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 border border-[var(--border-color)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt={post.caption}
                      className="w-full h-48 object-cover transition-transform duration-300 hover:scale-102"
                      loading="lazy"
                    />
                    {post.doodleSticker && (
                      <span className="absolute bottom-2 right-2 text-xl drop-shadow-md select-none">
                        {post.doodleSticker}
                      </span>
                    )}
                  </div>
                )}

                {/* Caption Snippet */}
                <p className="text-xs text-[var(--ink-primary)] leading-relaxed font-sans">
                  {post.caption}
                </p>

                {/* Interactive Action Bar (Like, Comment, Share) */}
                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--ink-secondary)] font-mono">
                  <div className="flex items-center gap-4">
                    {/* Like button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLike(post.id);
                      }}
                      className={`flex items-center gap-1 hover:text-red-500 transition-colors cursor-pointer ${
                        isLiked ? "text-red-500 font-bold" : ""
                      }`}
                      aria-label={`${isLiked ? "Unlike" : "Like"} post by ${post.author}`}
                    >
                      <span>{isLiked ? "❤️" : "🤍"}</span>
                      <span>{post.likes + (isLiked ? 1 : 0)}</span>
                    </button>

                    {/* Comment button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCommentPostId(
                          activeCommentPostId === post.id ? null : post.id
                        );
                      }}
                      className="flex items-center gap-1 hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                      aria-label="Comment on post"
                    >
                      <span>💬</span>
                      <span>{post.comments}</span>
                    </button>
                  </div>

                  {/* Share button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(post);
                    }}
                    className="flex items-center gap-1 hover:text-[var(--ink-primary)] transition-colors cursor-pointer text-[11px]"
                    aria-label="Share story deep link"
                  >
                    <span>↗ Share</span>
                  </button>
                </div>

                {/* Inline Comment Composer Box */}
                {activeCommentPostId === post.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="pt-2 border-t border-[var(--border-color)] flex items-center gap-1.5 animate-in fade-in"
                  >
                    <input
                      type="text"
                      placeholder="Add a sketchbook note..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddComment(post.id);
                      }}
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-primary)] placeholder-[var(--ink-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)]"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-medium cursor-pointer"
                    >
                      Post
                    </button>
                  </div>
                )}
              </article>
            );
          })}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 6)}
              className="w-full py-2 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--ink-primary)] transition-colors cursor-pointer shadow-2xs"
            >
              Load more stories ({filteredPosts.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
