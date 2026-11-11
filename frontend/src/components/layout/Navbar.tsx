"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InkIcon } from "@/components/ui/InkIcon";
import { Brand } from "./Brand";

export function Navbar({ onStartDoodling, onStoriesClick, onProfileClick }: {
  onStartDoodling?: () => void;
  onExploreClick?: () => void;
  onStoriesClick?: () => void;
  onProfileClick?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="site-nav" aria-label="Main navigation">
      <div className="site-nav-inner">
        <Brand />
        <div className="site-nav-links">
          <Link href="/explore">Explore</Link>
          <button onClick={onStoriesClick}>Stories</button>
          <a href="#gallery">Gallery</a>
          <button onClick={onProfileClick}>My board</button>
        </div>
        <div className="site-nav-actions">
          <ThemeToggle />
          <button onClick={onStartDoodling} className="button-ink nav-create"><InkIcon name="pen" size={16} />Start doodling</button>
          <button className="icon-button nav-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation">
            {mobileOpen ? <InkIcon name="close" /> : <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M3 6h14M3 13h14" /></svg>}
          </button>
        </div>
      </div>
      {mobileOpen && <div className="mobile-navigation" id="mobile-navigation">
        <Link href="/explore" onClick={() => setMobileOpen(false)}>Explore the world<InkIcon name="arrow" /></Link>
        <button onClick={() => { setMobileOpen(false); onStoriesClick?.(); }}>Community stories<InkIcon name="arrow" /></button>
        <a href="#gallery" onClick={() => setMobileOpen(false)}>The gallery<InkIcon name="arrow" /></a>
        <button onClick={() => { setMobileOpen(false); onProfileClick?.(); }}>My travel board<InkIcon name="arrow" /></button>
        <button onClick={() => { setMobileOpen(false); onStartDoodling?.(); }} className="button-ink"><InkIcon name="pen" />Start doodling</button>
      </div>}
    </nav>
  );
}
