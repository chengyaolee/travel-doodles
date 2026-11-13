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

/** Authentic hand-drawn doodle Sun icon with organic rays and ink line-weight */
function DoodleSunIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Hand-drawn organic wobbly sun center */}
      <path d="M12 7.2c2.6-.3 4.9 1.7 5.1 4.4.2 2.8-1.9 5.2-4.7 5.3-2.8.1-5.2-1.9-5.3-4.7-.1-2.8 2-5.1 4.9-5z" />
      {/* Hand-drawn expressive doodle rays */}
      <path d="M12 2.3c-.1 1.1-.1 2.2 0 3.1" />
      <path d="M16.9 7.1c.8-.8 1.7-1.6 2.6-2.3" />
      <path d="M18.5 12c1.1 0 2.2.1 3.2 0" />
      <path d="M16.8 16.9c.9.8 1.7 1.7 2.4 2.6" />
      <path d="M12 18.5c0 1.1.1 2.1 0 3.2" />
      <path d="M7.1 16.9c-.8.8-1.7 1.7-2.5 2.5" />
      <path d="M2.3 12c1.1 0 2.1-.1 3.2 0" />
      <path d="M7.1 7.1c-.8-.8-1.7-1.7-2.5-2.5" />
    </svg>
  );
}

/** Authentic hand-drawn doodle Crescent Moon with sparkle stars */
function DoodleMoonIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Hand-drawn wobbly doodle crescent */}
      <path d="M14.8 3.5c-.7 1.8-.5 3.7.4 5.5 1 2.1 2.8 3.7 5 4.3-1 2.8-3.2 5.1-6.1 5.9-3.5 1-7.3-.3-9.5-3.2-2.3-3-2.4-7.2-.3-10.4 1.8-2.7 4.9-4.3 8.1-4.3.8 0 1.6.1 2.4.2z" />
      {/* Hand-drawn 4-point doodle sparkle star */}
      <path
        d="M19 4.2c0 1.3.5 2 1.6 2.4-1.1.4-1.6 1.1-1.6 2.4 0-1.3-.5-2-1.6-2.4 1.1-.4 1.6-1.1 1.6-2.4z"
        strokeWidth="1.2"
        fill="currentColor"
      />
      {/* Secondary cute doodle ink star dot */}
      <circle cx="15.2" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
