"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DoodleGlobe } from "@/components/doodles";

export function Navbar({
  onStartDoodling,
  onExploreClick,
  onStoriesClick,
  onProfileClick,
}: {
  onStartDoodling?: () => void;
  onExploreClick?: () => void;
  onStoriesClick?: () => void;
  onProfileClick?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] shadow-xs"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-3 group select-none">
          <DoodleGlobe size={32} className="transition-transform duration-300 group-hover:rotate-12" />
          <div className="flex flex-col">
            <span className="font-hand text-2xl md:text-3xl font-bold text-[var(--ink-primary)] leading-none">
              Travel Doodles
            </span>
            <span className="text-[10px] font-mono text-[var(--ink-secondary)] tracking-wider mt-0.5">
              LIVING TRAVEL WHITEBOARD
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-7">
          <Link
            href="/explore"
            className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
          >
            Explore Map
          </Link>
          <button
            onClick={onStoriesClick}
            className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
          >
            Community Feed
          </button>
          <a
            href="#gallery"
            className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
          >
            Gallery
          </a>
          <button
            onClick={onProfileClick}
            className="text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
          >
            My Board
          </button>

          <div className="w-px h-5 bg-[var(--border-color)]" />

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* CTA Button */}
          <button
            onClick={onStartDoodling}
            className="px-5 py-2.5 text-sm font-bold bg-[var(--ink-primary)] text-[var(--bg-primary)] rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs font-hand text-lg flex items-center gap-1.5 leading-none"
          >
            <span>Start Doodling</span>
            <span>✏️</span>
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ink-primary)" strokeWidth="1.5" strokeLinecap="round">
              {mobileOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="17" y2="6" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="14" x2="17" y2="14" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[var(--bg-primary)] border-b border-[var(--border-color)] px-6 pb-6 pt-3 space-y-3 animate-fade-in-up">
          <Link
            href="/explore"
            onClick={() => setMobileOpen(false)}
            className="block py-2.5 text-sm font-medium text-[var(--ink-primary)]"
          >
            🗺️ Explore Map
          </Link>
          <button
            onClick={() => {
              setMobileOpen(false);
              onStoriesClick?.();
            }}
            className="w-full text-left py-2.5 text-sm font-medium text-[var(--ink-primary)]"
          >
            📸 Community Feed
          </button>
          <a
            href="#gallery"
            onClick={() => setMobileOpen(false)}
            className="block py-2.5 text-sm font-medium text-[var(--ink-primary)]"
          >
            🖼️ Gallery
          </a>
          <button
            onClick={() => {
              setMobileOpen(false);
              onProfileClick?.();
            }}
            className="w-full text-left py-2.5 text-sm font-medium text-[var(--ink-primary)]"
          >
            👤 My Travel Board
          </button>
          <button
            onClick={() => {
              setMobileOpen(false);
              onStartDoodling?.();
            }}
            className="w-full py-3.5 text-sm font-bold bg-[var(--ink-primary)] text-[var(--bg-primary)] rounded-xl font-hand text-lg mt-2"
          >
            Start Doodling ✏️
          </button>
        </div>
      )}
    </nav>
  );
}
