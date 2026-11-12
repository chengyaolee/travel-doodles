"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExplorePost } from "@/lib/explore/mockPosts";
import { InkIcon } from "@/components/ui/InkIcon";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { DoodlePin } from "@/components/doodles";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

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
  const { requireAuth } = useAuth();

  const selectedPostRef = useRef<HTMLDivElement>(null);

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
    requireAuth("like this memory", () => {
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: !prev[postId],
      }));
      // Sync to backend real API
      api.toggleLike(postId).catch((e) => console.warn("Like sync notice:", e));
    });
  };

  const handleShare = (post: ExplorePost) => {
    const url = `${window.location.origin}/explore?country=${post.country}&region=${post.region}&post=${post.id}`;
    if (!navigator.clipboard) {
      setToastMessage("Story link: " + url);
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => setToastMessage("Story link copied"),
      () => setToastMessage("Could not copy the link. Please try again.")
    );
  };

  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    requireAuth("leave a comment", () => {
      // Sync to backend real API
      api.addComment(postId, text).catch((e) => console.warn("Comment sync notice:", e));
      setToastMessage(`Comment added: "${text}"`);
      setCommentText("");
      setActiveCommentPostId(null);
    });
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
    <aside className="regional-feed" aria-label={`Regional feed for ${regionName || countryName}`}>
      {toastMessage && <div className="feed-toast" role="status">{toastMessage}</div>}
      <div className="sr-only" role="status" aria-live="polite">Showing regional feed for {regionName || countryName}. {filteredPosts.length} stories found.</div>

      <div className="feed-header">
        <nav aria-label="Breadcrumb" className="feed-breadcrumbs">
          <button onClick={onBackToWorld}>World</button><span aria-hidden="true">/</span>
          {regionId ? <button onClick={onBackToCountry}>{countryName || "Country"}</button> : <span aria-current="page">{countryName || "Country"}</span>}
          {regionId && <><span aria-hidden="true">/</span><span aria-current="page" className="truncate">{regionName}</span></>}
          <button onClick={onClose} className="icon-button" aria-label="Close feed drawer"><InkIcon name="close" size={17} /></button>
        </nav>
        <div className="feed-heading"><h2>{regionName || countryName}</h2>{regionLocalName && <span className="feed-local-name">{regionLocalName}</span>}</div>
        <div className="feed-intro"><span>{filteredPosts.length} {filteredPosts.length === 1 ? "story" : "stories"} · {visibilityFilter === "friends" ? "From your friends" : "From the community"}</span><span className="font-hand">a little closer.</span></div>
      </div>

      <div className="feed-scroll" key={`${countryCode ?? "world"}-${regionId ?? "all"}`}>
        {(regionId || cities.length > 0) && <div className="feed-location-controls">
        {regionId && onBackToCountry && <button onClick={onBackToCountry} className="feed-region-back"><InkIcon name="back" size={15} />All {stateTypeLabel.toLowerCase()}</button>}
        {cities.length > 0 && <div className="feed-city"><label htmlFor="city-filter">Wander through</label><select id="city-filter" value={selectedCity || ""} onChange={(e) => onSelectCity(e.target.value || null)}><option value="">All cities</option>{cities.map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}</select></div>}

        </div>}

        {!regionId && regionsList.length > 0 && (
          <section className="region-directory" aria-label={stateTypeLabel}>
            <div className="region-directory-top"><h3>{stateTypeLabel} <span className="text-[var(--ink-secondary)] font-normal">{regionsList.length}</span></h3>{regionsList.length > 6 && <button onClick={() => setShowAllStates(!showAllStates)} aria-expanded={showAllStates}>{showAllStates ? "Show less" : "View all"}</button>}</div>
            {regionsList.length > 6 && <input type="search" className="region-search" aria-label={`Search ${stateTypeLabel.toLowerCase()}`} placeholder={`Find a ${stateTypeLabel === "Prefectures" ? "prefecture" : "region"}…`} value={stateSearch} onChange={(e) => setStateSearch(e.target.value)} />}
            <div className={`region-list ${showAllStates || stateSearch.trim() ? "max-h-72 overflow-y-auto" : ""}`}>
              {(showAllStates || stateSearch.trim() ? filteredStates : filteredStates.slice(0, 6)).map((state) => <button key={state.id} onClick={() => onSelectRegion?.(state.id)} className="region-item"><span className="region-item-top"><span>{state.name}</span><span>{state.postCount}</span></span>{state.localName && state.localName !== state.name && <span className="region-item-local truncate">{state.localName}</span>}</button>)}
            </div>
            {filteredStates.length === 0 && <p className="text-xs text-[var(--ink-secondary)] mt-3">No regions found. Try another name.</p>}
          </section>
        )}

        <div className="feed-filters">
          <div className="feed-sort" aria-label="Sort stories"><button onClick={() => setSortBy("recent")} aria-pressed={sortBy === "recent"}>Latest stories</button><button onClick={() => setSortBy("popular")} aria-pressed={sortBy === "popular"}>Popular</button></div>
          <button onClick={() => setFilterPhotosOnly(!filterPhotosOnly)} aria-pressed={filterPhotosOnly} className="photo-filter"><InkIcon name="photo" size={16} />Photos</button>
        </div>

        {isLoading && <div aria-busy="true" aria-label="Loading stories" className="space-y-4 animate-pulse"><div className="h-8 w-1/2 rounded bg-[var(--bg-elevated)]" /><div className="h-48 rounded bg-[var(--bg-elevated)]" /><div className="h-4 w-3/4 rounded bg-[var(--bg-elevated)]" /></div>}
        {hasError && <div className="feed-empty" role="alert"><DoodlePin size={32} /><h3>A small detour.</h3><p>We couldn’t load these stories. Please try again.</p>{onRetry && <button onClick={onRetry} className="feed-load-more mt-4">Try again</button>}</div>}
        {!isLoading && !hasError && displayedPosts.length === 0 && <div className="feed-empty"><DoodlePin size={36} /><h3>A place for a new story.</h3><p>{selectedCity || regionName || countryName} has no {visibilityFilter === "friends" ? "friends’ " : ""}{filterPhotosOnly ? "photo " : ""}stories here yet. There’s still a whole world to wander.</p></div>}

        {!isLoading && !hasError && displayedPosts.map((post) => {
          const isSelected = post.id === selectedPostId;
          const isLiked = Boolean(likedPosts[post.id]);
          return (
            <article key={post.id} ref={isSelected ? selectedPostRef : null} className={`feed-story ${isSelected ? "is-selected" : ""}`} aria-label={`Story by ${post.author} in ${post.location}`}>
              <div className="feed-story-header">
                <AnonymousAvatar
                  avatarUrl={post.avatar}
                  name={post.author}
                  size={36}
                  className="border border-[var(--border-color)] shrink-0"
                />
                <div><p className="feed-story-author">{post.author}</p><p className="feed-story-date"><time dateTime={post.date}>{new Date(`${post.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time></p></div>
                <span className="story-visibility">{post.visibility === "friends" ? "Friends" : "Everyone"}</span>
              </div>
              {post.image && !post.isTextOnly ? (
                <button className="story-photo" onClick={() => onSelectPost(post.id)} aria-label={`View ${post.author}’s story in ${post.city}`} aria-pressed={isSelected}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.image} alt={post.caption} loading="lazy" width={480} height={320} />
                  <span className="story-location"><span>{post.location || `${post.city}, ${countryName}`}</span><InkIcon name="arrow" size={18} /></span>
                </button>
              ) : <button className="story-location" onClick={() => onSelectPost(post.id)} aria-pressed={isSelected}>{post.location || post.city}<InkIcon name="arrow" size={18} /></button>}
              <p className="story-caption">{post.caption}</p>
              <div className="story-actions">
                <button onClick={() => handleToggleLike(post.id)} aria-pressed={isLiked} aria-label={`${isLiked ? "Unlike" : "Like"} post by ${post.author}`}><InkIcon name="heart" size={18} fill={isLiked ? "currentColor" : "none"} /><span>{post.likes + (isLiked ? 1 : 0)}</span></button>
                <button
                  onClick={() => {
                    requireAuth("leave a comment", () => {
                      setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id);
                    });
                  }}
                  aria-label="Comment on post"
                  aria-expanded={activeCommentPostId === post.id}
                >
                  <InkIcon name="comment" size={17} /><span>{post.comments}</span>
                </button>
                <button onClick={() => handleShare(post)} aria-label="Share story deep link"><InkIcon name="share" size={16} />Share</button>
              </div>
              {activeCommentPostId === post.id && <form className="story-comment" onSubmit={(e) => { e.preventDefault(); handleAddComment(post.id); }}><input type="text" aria-label="Your comment" placeholder="Leave a little note…" value={commentText} onChange={(e) => setCommentText(e.target.value)} /><button type="submit">Post</button></form>}
            </article>
          );
        })}
        {hasMore && !isLoading && <button onClick={() => setVisibleCount((prev) => prev + 6)} className="feed-load-more">More stories <span className="text-[var(--ink-secondary)]">({filteredPosts.length - visibleCount})</span></button>}
      </div>
    </aside>
  );
}
