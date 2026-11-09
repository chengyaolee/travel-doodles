"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <span className="w-4 h-4" />
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors duration-200 cursor-pointer"
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
    >
      {resolvedTheme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="3.5" />
          <line x1="8" y1="1" x2="8" y2="2.5" />
          <line x1="8" y1="13.5" x2="8" y2="15" />
          <line x1="1" y1="8" x2="2.5" y2="8" />
          <line x1="13.5" y1="8" x2="15" y2="8" />
          <line x1="3.05" y1="3.05" x2="4.1" y2="4.1" />
          <line x1="11.9" y1="11.9" x2="12.95" y2="12.95" />
          <line x1="3.05" y1="12.95" x2="4.1" y2="11.9" />
          <line x1="11.9" y1="4.1" x2="12.95" y2="3.05" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13.5 8.5a5.5 5.5 0 0 1-7.5-7.5 6 6 0 1 0 7.5 7.5z" />
        </svg>
      )}
    </button>
  );
}
