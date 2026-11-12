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
import { useAuth } from "@/lib/authContext";

export default function Home() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string | null>(null);

  // User-created and real backend database posts (Zero mock data defaults)
  const [userPosts, setUserPosts] = useState<TravelDoodlePost[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { requireAuth } = useAuth();

  // Connect to real backend API to load database posts
  useEffect(() => {
    api.getPosts({ limit: 40 })
      .then((serverPosts) => {
        if (serverPosts && serverPosts.length > 0) {
          const mapped: TravelDoodlePost[] = serverPosts.map((p) => ({
            id: p.id,
            location: p.location || `${p.city}, ${p.country}`,
            city: p.city,
            country: p.country,
            region: p.region,
            caption: p.caption,
            date: p.date,
            visibility: p.visibility,
            image: p.image || "",
            doodleSticker: "",
            author: p.author,
            avatar: p.avatar,
            likes: p.likes,
            coordinates: p.coordinates || [0, 0],
          }));
          setUserPosts(mapped);
        } else {
          setUserPosts([]);
        }
      })
      .catch((e) => console.warn("Live backend posts notice:", e));
  }, []);

  const handlePublishPost = (newPost: TravelDoodlePost) => {
    setUserPosts((prev) => [newPost, ...prev]);
    setToastMessage(`Pinned "${newPost.city}" to the travel whiteboard!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleHeroSelectPin = (city: string) => {
    setToastMessage(`Explored "${city}" on the map`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleViewProfile = (username: string) => {
    setViewingProfileUsername(username);
    setIsProfileOpen(true);
  };

  const handleStartDoodling = () => {
    requireAuth("create a travel doodle", () => setIsCreateOpen(true));
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
            View in Explore Atlas →
          </Link>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onStartDoodling={handleStartDoodling}
        onExploreClick={() => setIsExploreOpen(true)}
        onStoriesClick={() => setIsFeedOpen(true)}
        onProfileClick={() => {
          setViewingProfileUsername(null);
          setIsProfileOpen(true);
        }}
      />

      {/* Main Page Canvas Sections */}
      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Landing Page Hero with Hand-drawn World Map */}
        <HeroSection
          posts={userPosts}
          onStartDoodling={handleStartDoodling}
          onExploreWorld={() => setIsExploreOpen(true)}
          onSelectPin={handleHeroSelectPin}
        />

        {/* Section A — Your World, Your Stories ("Every pin has a story.") */}
        <SectionA
          posts={userPosts}
          onExploreClick={() => setIsExploreOpen(true)}
          onCreateClick={handleStartDoodling}
        />

        {/* Section B — Leave Your Mark (3-step creation flow with doodle connectors) */}
        <SectionB onCreateClick={handleStartDoodling} />

        {/* Section C — Follow the Dotted Lines ("See where your friends wander.") */}
        <SectionC
          posts={userPosts}
          onCreateClick={handleStartDoodling}
          onViewProfile={handleViewProfile}
        />

        {/* Section D — A World Full of Doodles (Curated travel photograph gallery) */}
        <SectionD
          posts={userPosts}
          onCreateClick={handleStartDoodling}
          onViewProfile={handleViewProfile}
        />

        {/* Section E — Your Own Little Corner of the World (Personal travel board) */}
        <SectionE
          posts={userPosts}
          onCreateClick={handleStartDoodling}
        />

        {/* Section F — Final CTA ("Got a story? Put it on the map." with hand-drawn arrow) */}
        <SectionF onCreateClick={handleStartDoodling} />
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
        onViewProfile={handleViewProfile}
      />

      <SocialFeedModal
        isOpen={isFeedOpen}
        onClose={() => setIsFeedOpen(false)}
        extraPosts={userPosts}
        onViewProfile={handleViewProfile}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setViewingProfileUsername(null);
        }}
        viewUsername={viewingProfileUsername}
        userPosts={userPosts}
      />
    </div>
  );
}
