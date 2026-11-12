"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { DoodlePin, DoodleUnderline } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";

export function AuthModal() {
  const { authModalOpen, authModalAction, closeAuthModal } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<"google" | "microsoft" | null>(null);

  if (!authModalOpen) return null;

  const handleOAuthLogin = (provider: "google" | "microsoft") => {
    setError(null);
    setConnecting(provider);
    window.location.href = `/api/v1/auth/oauth/${provider}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={closeAuthModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-[var(--bg-primary)] border-2 border-[var(--ink-primary)] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col text-[var(--ink-primary)] overflow-hidden my-8"
        style={{
          boxShadow: "6px 6px 0px 0px var(--ink-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer text-[var(--ink-primary)]"
          aria-label="Close"
        >
          <InkIcon name="close" size={13} />
        </button>

        {/* Header with Needle Pin */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-2">
            <DoodlePin size={40} className="drop-shadow-md" filled />
          </div>
          <span className="font-hand text-base text-[var(--ink-secondary)]">
            Traveler Passport
          </span>
          <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight">
            Sign In to Travel Doodles
          </h2>
          <DoodleUnderline className="w-40 h-2 text-[var(--ink-primary)] mt-1" />

          {authModalAction && (
            <p className="mt-3 text-xs text-[var(--ink-secondary)] bg-[var(--bg-secondary)] px-3.5 py-1.5 rounded-full border border-[var(--border-color)]">
              Sign in to {authModalAction}
            </p>
          )}
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium text-center">
            {error}
          </div>
        )}

        {/* Passwordless OAuth Options Only */}
        <div className="flex flex-col gap-3 my-2">
          {/* Continue with Google */}
          <button
            type="button"
            disabled={connecting !== null}
            onClick={() => handleOAuthLogin("google")}
            className="w-full py-3 px-4 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--ink-primary)] flex items-center justify-center gap-3 text-sm font-semibold text-[var(--ink-primary)] transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {/* Google Monochrome G Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>
              {connecting === "google" ? "Connecting to Google..." : "Continue with Google"}
            </span>
          </button>

          {/* Continue with Microsoft */}
          <button
            type="button"
            disabled={connecting !== null}
            onClick={() => handleOAuthLogin("microsoft")}
            className="w-full py-3 px-4 rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--ink-primary)] flex items-center justify-center gap-3 text-sm font-semibold text-[var(--ink-primary)] transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {/* Microsoft 4-Quadrant Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <rect x="1" y="1" width="10" height="10" />
              <rect x="13" y="1" width="10" height="10" />
              <rect x="1" y="13" width="10" height="10" />
              <rect x="13" y="13" width="10" height="10" />
            </svg>
            <span>
              {connecting === "microsoft" ? "Connecting to Microsoft..." : "Continue with Microsoft"}
            </span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="mt-5 text-center text-[11px] text-[var(--ink-secondary)] leading-relaxed">
          Browsing the world atlas is completely free. Pinned memories, likes, and comments stay saved to your personal traveler board.
        </p>
      </div>
    </div>
  );
}
