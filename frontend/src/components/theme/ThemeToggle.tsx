"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by defaulting to false until mounted
  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
      className={`group relative inline-flex items-center w-[62px] h-[32px] rounded-full p-[2px] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-primary)] select-none cursor-pointer shrink-0 ${
        isDark
          ? "bg-[#2c3246] border border-[#3e4760] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
          : "bg-[#e2e6ed] border border-[#cbd1dc] shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]"
      } ${className}`}
      title={isDark ? "Appearance: Dark (click for Light)" : "Appearance: Light (click for Dark)"}
    >
      <span className="sr-only">Toggle dark mode</span>

      {/* Inactive Track Icon - Left (faint doodle Sun when dark) */}
      <span
        aria-hidden="true"
        className={`absolute left-[7px] top-1/2 -translate-y-1/2 transition-opacity duration-300 pointer-events-none flex items-center justify-center ${
          isDark ? "opacity-35 text-[#8893ab]" : "opacity-0"
        }`}
      >
        <DoodleSunIcon size={16} />
      </span>

      {/* Inactive Track Icon - Right (faint doodle Moon when light) */}
      <span
        aria-hidden="true"
        className={`absolute right-[7px] top-1/2 -translate-y-1/2 transition-opacity duration-300 pointer-events-none flex items-center justify-center ${
          !isDark ? "opacity-35 text-[#8b95a8]" : "opacity-0"
        }`}
      >
        <DoodleMoonIcon size={16} />
      </span>

      {/* Sliding Knob */}
      <span
        aria-hidden="true"
        className={`relative flex items-center justify-center w-[26px] h-[26px] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isDark
            ? "translate-x-[32px] shadow-[0_2px_6px_rgba(0,0,0,0.5)] border border-[#2b3040]"
            : "translate-x-[1px] shadow-[0_2px_5px_rgba(0,0,0,0.18)] border border-[#d2d6df]"
        }`}
      >
        {isDark ? (
          <DoodleMoonIcon size={16} className="text-[#3b49df]" />
        ) : (
          <DoodleSunIcon size={16} className="text-[#e88118]" />
        )}
      </span>
    </button>
  );
}

/** Cute hand-drawn doodle Sun icon with radiating ink rays */
function DoodleSunIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Hand-drawn style slightly organic sun center */}
      <circle cx="12" cy="12" r="4.2" strokeWidth="2.3" />
      {/* Doodle ray dashes */}
      <line x1="12" y1="2.4" x2="12" y2="4.8" />
      <line x1="12" y1="19.2" x2="12" y2="21.6" />
      <line x1="2.4" y1="12" x2="4.8" y2="12" />
      <line x1="19.2" y1="12" x2="21.6" y2="12" />
      <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
      <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
      <line x1="5.2" y1="18.8" x2="6.9" y2="17.1" />
      <line x1="17.1" y1="6.9" x2="18.8" y2="5.2" />
    </svg>
  );
}

/** Cute hand-drawn doodle Crescent Moon with sparkle stars */
function DoodleMoonIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Hand-drawn doodle crescent */}
      <path
        d="M14.8 3.6a7.8 7.8 0 1 0 5.6 12 8.2 8.2 0 0 1-5.6-12z"
        strokeWidth="2.2"
      />
      {/* Hand-drawn sparkle stars */}
      <path
        d="M18.8 4.6l.4 1.3 1.3.4-1.3.4-.4 1.3-.4-1.3-1.3-.4 1.3-.4.4-1.3z"
        strokeWidth="1.2"
        fill="currentColor"
      />
      <circle cx="14.8" cy="7.2" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
