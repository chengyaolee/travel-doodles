"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InkIcon } from "@/components/ui/InkIcon";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { Brand } from "./Brand";
import { useAuth } from "@/lib/authContext";

export function Navbar({
  onStartDoodling,
  onStoriesClick,
  onProfileClick,
}: {
  onStartDoodling?: () => void;
  onExploreClick?: () => void;
  onStoriesClick?: () => void;
  onProfileClick?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout, requireAuth, openAuthModal } = useAuth();

  const handleStartDoodling = () => {
    requireAuth("create a travel doodle", onStartDoodling);
  };

  const handleProfileClick = () => {
    requireAuth("view your personal travel board", onProfileClick);
  };

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <div className="site-nav-inner">
        <Brand />
        <div className="site-nav-links">
          <Link href="/explore">Explore</Link>
          <button onClick={onStoriesClick}>Stories</button>
          <a href="#gallery">Gallery</a>
          <button onClick={handleProfileClick}>My board</button>
        </div>
        <div className="site-nav-actions">
          <ThemeToggle />

          {/* User Auth Status / Actions: Smooth transition with zero flash during session resolution */}
          {isLoading ? (
            <div className="flex items-center gap-2 min-w-[80px] h-7" aria-hidden="true" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleProfileClick}
                className="flex items-center gap-2 py-1 px-2.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-colors text-xs font-medium cursor-pointer"
                title={`Logged in as @${user.custom_id}`}
              >
                <AnonymousAvatar
                  src={user.avatar_url}
                  alt={user.display_name}
                  size={20}
                  className="w-5 h-5"
                />
                <span className="hidden sm:inline font-mono">@{user.custom_id}</span>
              </button>
              <button
                onClick={() => logout()}
                className="px-2 py-1 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                title="Log out"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal("log in to your board")}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => openAuthModal("create your traveler account")}
                className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                Join
              </button>
            </div>
          )}

          <button
            className="icon-button nav-menu-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? (
              <InkIcon name="close" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                <path d="M3 6h14M3 13h14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-navigation" id="mobile-navigation">
          <Link href="/explore" onClick={() => setMobileOpen(false)}>
            Explore the world<InkIcon name="arrow" />
          </Link>
          <button onClick={() => { setMobileOpen(false); onStoriesClick?.(); }}>
            Community stories<InkIcon name="arrow" />
          </button>
          <a href="#gallery" onClick={() => setMobileOpen(false)}>
            The gallery<InkIcon name="arrow" />
          </a>
          <button onClick={() => { setMobileOpen(false); handleProfileClick(); }}>
            My travel board<InkIcon name="arrow" />
          </button>
          {isAuthenticated ? (
            <button
              onClick={() => {
                setMobileOpen(false);
                logout();
              }}
              className="text-left text-xs text-[var(--ink-secondary)] py-2"
            >
              Log out (@{user?.custom_id})
            </button>
          ) : (
            <button
              onClick={() => {
                setMobileOpen(false);
                openAuthModal();
              }}
              className="text-left text-xs font-semibold py-2"
            >
              Log in / Create account
            </button>
          )}
          <button onClick={() => { setMobileOpen(false); handleStartDoodling(); }} className="button-ink">
            <InkIcon name="pen" />Start doodling
          </button>
        </div>
      )}
    </nav>
  );
}
