"use client";

import { DoodleGlobe } from "@/components/doodles";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <DoodleGlobe size={24} />
              <span className="font-hand text-lg font-semibold text-[var(--ink-primary)]">
                Travel Doodles
              </span>
            </div>
            <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
              The world is your canvas. Pin your adventures and share your stories.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--ink-primary)] mb-4">Explore</h4>
            <ul className="space-y-3">
              {["World Map", "Destinations", "Stories", "Gallery"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--ink-primary)] mb-4">Community</h4>
            <ul className="space-y-3">
              {["Friends", "Trending", "Featured", "Events"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--ink-primary)] mb-4">About</h4>
            <ul className="space-y-3">
              {["About Us", "Blog", "Careers", "Contact"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--ink-secondary)]">
            © 2026 Travel Doodles. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Cookies"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
