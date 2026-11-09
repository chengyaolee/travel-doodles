"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExplorePost } from "@/lib/explore/mockPosts";

interface RegionalFeedProps {
  countryCode: string | null;
  countryName: string;
  regionId: string | null;
  regionName: string;
  regionLocalName?: string;
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
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] mb-2 font-mono">
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
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer flex items-center gap-1"
            aria-label="Close feed drawer"
          >
            <span>Close</span>
            <span>✕</span>
          </button>
        </div>

        {/* City Filter Dropdown if available */}
        {cities && cities.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="city-filter" className="text-xs text-[var(--ink-secondary)] font-medium">
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

        {/* Sort & Filter Controls */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
          {/* Sort Tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => setSortBy("recent")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                sortBy === "recent"
                  ? "bg-[var(--bg-primary)] font-semibold text-[var(--ink-primary)] shadow-xs"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy("popular")}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
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
        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading stories">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 animate-pulse space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)]" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3 bg-[var(--bg-elevated)] rounded" />
                    <div className="w-16 h-2 bg-[var(--bg-elevated)] rounded" />
                  </div>
                </div>
                <div className="w-full h-44 bg-[var(--bg-elevated)] rounded-lg" />
                <div className="w-full h-3 bg-[var(--bg-elevated)] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Retryable Error State */}
        {!isLoading && hasError && (
          <div className="p-6 text-center space-y-3 rounded-xl border border-dashed border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Failed to load stories
            </h3>
            <p className="text-xs text-[var(--ink-secondary)]">
              Could not retrieve regional journal entries. Please check your network connection.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Retry loading
              </button>
            )}
          </div>
        )}

        {/* Empty State: No Posts */}
        {!isLoading && !hasError && filteredPosts.length === 0 && (
          <div className="p-8 text-center space-y-3 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/30">
            <span className="text-3xl">📖</span>
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              {visibilityFilter === "friends" ? "No friends stories here yet" : "No stories pinned yet"}
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] max-w-xs mx-auto leading-relaxed">
              {visibilityFilter === "friends"
                ? "None of your friends have shared journal entries in this region yet. Switch to Explore to view public travel doodles."
                : `Be the very first traveler to pin a sketch, Polaroid photo, or travel story to ${regionName || countryName}!`}
            </p>
            {countryCode && (
              <button
                onClick={onBackToWorld}
                className="inline-block mt-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-color)] text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
              >
                ← Back to World Map
              </button>
            )}
          </div>
        )}

        {/* Post Cards List */}
        {!isLoading && !hasError && displayedPosts.map((post) => {
          const isSelected = post.id === selectedPostId;
          const isLiked = likedPosts[post.id];
          const likeCount = post.likes + (isLiked ? 1 : 0);

          return (
            <article
              key={post.id}
              ref={isSelected ? selectedPostRef : null}
              tabIndex={0}
              onClick={() => onSelectPost(post.id)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-[var(--ink-primary)] bg-[var(--bg-primary)] shadow-xl ring-1 ring-[var(--ink-primary)]"
                  : "border-[var(--border-color)] bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/80 hover:shadow-md"
              }`}
            >
              {/* Card Header: Author, Avatar, Date & Demo Tag */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.avatar}
                    alt={post.author}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]"
                    loading="lazy"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--ink-primary)] leading-tight">
                      {post.author}
                    </span>
                    <span className="text-[10px] text-[var(--ink-secondary)]">
                      Visited: {post.date} · {post.city}
                    </span>
                  </div>
                </div>

                {/* Explicit Demo Badge as required by prompt brief */}
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--ink-secondary)]">
                  Demo
                </span>
              </div>

              {/* Photo Area */}
              {post.image && !post.isTextOnly && (
                <div className="relative w-full h-48 rounded-lg overflow-hidden mb-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image}
                    alt={post.caption}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    loading="lazy"
                  />
                  {post.doodleSticker && (
                    <span className="absolute bottom-2 right-2 text-xl drop-shadow-md select-none">
                      {post.doodleSticker}
                    </span>
                  )}
                </div>
              )}

              {/* Caption */}
              <p className="text-xs text-[var(--ink-primary)] leading-relaxed mb-3">
                {post.caption}
              </p>

              {/* Social Action Controls: Like, Comment, Share */}
              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--ink-secondary)]">
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLike(post.id);
                    }}
                    className={`flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer ${
                      isLiked ? "text-red-500 font-semibold" : ""
                    }`}
                    aria-label={`Like story by ${post.author}`}
                  >
                    <span>{isLiked ? "❤️" : "🤍"}</span>
                    <span>{likeCount}</span>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id);
                    }}
                    className="flex items-center gap-1.5 hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                    aria-label={`Comment on story by ${post.author}`}
                  >
                    <span>💬</span>
                    <span>{post.comments}</span>
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(post);
                  }}
                  className="flex items-center gap-1 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                  title="Copy permanent link"
                  aria-label="Share story"
                >
                  <span>🔗</span>
                  <span>Share</span>
                </button>
              </div>

              {/* Inline Demo Comment Box */}
              {activeCommentPostId === post.id && (
                <div
                  className="mt-3 pt-2.5 border-t border-[var(--border-color)] flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                    placeholder="Write a comment..."
                    className="flex-1 text-xs px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--ink-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)]"
                  />
                  <button
                    onClick={() => handleAddComment(post.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--ink-primary)] text-[var(--bg-primary)] hover:opacity-90 cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {/* Load More Button */}
        {!isLoading && hasMore && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 4)}
              className="w-full py-2 px-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer shadow-xs"
            >
              Load more stories ({filteredPosts.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
