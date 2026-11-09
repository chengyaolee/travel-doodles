"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/hero/HeroSection";
import {
  SectionA,
  SectionB,
  SectionC,
  SectionD,
  SectionE,
  SectionF,
} from "@/components/sections";
import {
  CreatePostModal,
  TravelDoodlePost,
} from "@/components/app/CreatePostModal";
import { ExploreMapModal } from "@/components/app/ExploreMapModal";
import { SocialFeedModal } from "@/components/app/SocialFeedModal";
import { ProfileModal } from "@/components/app/ProfileModal";
import { api } from "@/lib/api";

export default function Home() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // User-created posts stored in React state for instant interactivity
  const [userPosts, setUserPosts] = useState<TravelDoodlePost[]>([
    {
      id: "post-demo-1",
      location: "Kyoto, Japan",
      city: "Kyoto",
      country: "Japan",
      caption: "Temple bells ringing through morning mist. Green matcha bowl warming my hands.",
      date: "2026-05-02",
      visibility: "everyone",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500&h=350&fit=crop",
      doodleSticker: "🍵",
      author: "You (Explorer)",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      likes: 12,
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Connect to real backend API to load live posts
  useEffect(() => {
    api.getPosts({ limit: 40 })
      .then((serverPosts) => {
        if (serverPosts && serverPosts.length > 0) {
          const mapped: TravelDoodlePost[] = serverPosts.map((p) => ({
            id: p.id,
            location: p.location || `${p.city}, ${p.country}`,
            city: p.city,
            country: p.country,
            caption: p.caption,
            date: p.date,
            visibility: p.visibility,
            image: p.image || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=350&fit=crop",
            doodleSticker: p.doodleSticker || "📍",
            author: p.author,
            avatar: p.avatar,
            likes: p.likes,
          }));
          setUserPosts(mapped);
        }
      })
      .catch((e) => console.warn("Notice: using initial post buffer:", e));
  }, []);

  const handlePublishPost = (newPost: TravelDoodlePost) => {
    setUserPosts((prev) => [newPost, ...prev]);
    setToastMessage(`Pinned "${newPost.city}" to the travel whiteboard! 📌`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleHeroSelectPin = (city: string) => {
    setToastMessage(`Explored "${city}" on the map 🗺️`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink-primary)] selection:bg-[var(--ink-primary)] selection:text-[var(--bg-primary)] flex flex-col relative overflow-x-hidden">
      {/* Toast Notification with Link to Explore Map */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-[var(--ink-primary)] text-[var(--bg-primary)] shadow-2xl font-hand text-base flex items-center gap-3 animate-fade-in-up border border-[var(--border-color)]">
          <span>{toastMessage}</span>
          <Link
            href="/explore"
            className="px-2.5 py-0.5 rounded-lg bg-[var(--bg-primary)] text-[var(--ink-primary)] font-sans text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            View in Explore Atlas 🗺️
          </Link>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onStartDoodling={() => setIsCreateOpen(true)}
        onExploreClick={() => setIsExploreOpen(true)}
        onStoriesClick={() => setIsFeedOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
      />

      {/* Main Page Canvas Sections */}
      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Landing Page Hero with Hand-drawn World Map & Parallax */}
        <HeroSection
          onStartDoodling={() => setIsCreateOpen(true)}
          onExploreWorld={() => setIsExploreOpen(true)}
          onSelectPin={handleHeroSelectPin}
        />

        {/* Section A — Your World, Your Stories ("Every pin has a story.") */}
        <SectionA onExploreClick={() => setIsExploreOpen(true)} />

        {/* Section B — Leave Your Mark (3-step creation flow with doodle connectors) */}
        <SectionB onCreateClick={() => setIsCreateOpen(true)} />

        {/* Section C — Follow the Dotted Lines ("See where your friends wander.") */}
        <SectionC />

        {/* Section D — A World Full of Doodles (Irregular masonry travel photo gallery) */}
        <SectionD />

        {/* Section E — Your Own Little Corner of the World (Personal travel board) */}
        <SectionE />

        {/* Section F — Final CTA ("Got a story? Put it on the map." with hand-drawn arrow) */}
        <SectionF onCreateClick={() => setIsCreateOpen(true)} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Application Modals */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPublish={handlePublishPost}
      />

      <ExploreMapModal
        isOpen={isExploreOpen}
        onClose={() => setIsExploreOpen(false)}
        extraPosts={userPosts}
      />

      <SocialFeedModal
        isOpen={isFeedOpen}
        onClose={() => setIsFeedOpen(false)}
        extraPosts={userPosts}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userPosts={userPosts}
      />
    </div>
  );
}
