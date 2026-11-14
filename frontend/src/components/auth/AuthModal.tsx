"use client";

import { useMobileModalBack } from "@/lib/useMobileModalBack";
import React, { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { DoodlePin, DoodleUnderline } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";

export function AuthModal() {
  const { authModalOpen, authModalAction, closeAuthModal, isAuthenticating, authStage } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<"google" | "microsoft" | null>(null);

  const isAuthenticatedSuccess = authStage === "authenticated";
  const showLoading = isAuthenticating || connecting !== null || isAuthenticatedSuccess;

  React.useEffect(() => {
    if (!authModalOpen) {
      setConnecting(null);
    }
  }, [authModalOpen]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get("auth_error") || params.get("error");
      if (authErr) {
        if (authErr.includes("not_configured")) {
          setError(
            authErr.includes("google")
              ? "Google OAuth is not configured on Vercel. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Vercel Project Settings (Environment Variables)."
              : "Microsoft OAuth is not configured on Vercel. Please add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in your Vercel Project Settings (Environment Variables)."
          );
        } else if (authErr.includes("missing")) {
          setError("OAuth authorization code was not returned. Please try signing in again.");
        } else if (authErr.includes("exchange_failed") || authErr.includes("token_failed")) {
          setError("OAuth token exchange failed with provider. Please check your credentials.");
        } else {
          setError(`Authentication error: ${authErr.replace(/_/g, " ")}`);
        }
      }
    }
  }, [authModalOpen]);

  useMobileModalBack(authModalOpen, closeAuthModal);

  if (!authModalOpen) return null;

  const handleOAuthLogin = (provider: "google" | "microsoft") => {
    setError(null);
    setConnecting(provider);
    setTimeout(() => {
      window.location.href = `/api/v1/auth/oauth/${provider}`;
    }, 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md min-h-[390px] bg-[var(--bg-primary)] border-2 border-[var(--ink-primary)] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between text-[var(--ink-primary)] overflow-hidden my-8"
        style={{
          boxShadow: "6px 6px 0px 0px var(--ink-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - hidden while authenticating to prevent aborting mid-handshake */}
        {!showLoading && (
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 w-8 h-8 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer text-[var(--ink-primary)]"
            aria-label="Close"
          >
            <InkIcon name="close" size={13} />
          </button>
        )}

        {showLoading ? (
          /* Loading / Authenticated window: Same size as the login prompt */
          <div className="flex flex-col items-center justify-center text-center my-auto py-6 animate-fade-in">
            {/* Spinning Doodle Dashed Orbit with Needle Pin / Checkmark */}
            <div className="relative mb-5 flex items-center justify-center">
              <svg
                className={`w-20 h-20 text-[var(--ink-primary)] ${isAuthenticatedSuccess ? "transition-transform duration-500 scale-105" : "animate-spin"}`}
                style={{ animationDuration: "5s" }}
                viewBox="0 0 100 100"
                fill="none"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={isAuthenticatedSuccess ? "none" : "6 8"}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {isAuthenticatedSuccess ? (
                  <div className="w-10 h-10 rounded-full bg-[var(--ink-primary)] text-[var(--bg-primary)] flex items-center justify-center shadow-sm">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : (
                  <DoodlePin size={38} className="text-[var(--ink-primary)] drop-shadow-sm" filled />
                )}
              </div>
            </div>

            <span className="font-hand text-base text-[var(--ink-secondary)] tracking-wide">
              Traveler Passport
            </span>
            <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight mt-0.5">
              {isAuthenticatedSuccess ? "Authenticated!" : "Authenticating..."}
            </h2>
            <DoodleUnderline className="w-44 h-2 text-[var(--ink-primary)] mt-1 animate-pulse" />

            <p className="mt-5 text-sm text-[var(--ink-secondary)] max-w-xs leading-relaxed">
              {isAuthenticatedSuccess
                ? "Passport verified! Welcome aboard."
                : connecting
                ? `Connecting to ${connecting === "google" ? "Google" : "Microsoft"}...`
                : "Processing traveler authentication and refreshing your travel board..."}
            </p>

            {/* Hand-drawn style animated progress bar */}
            <div className="mt-6 w-full max-w-[200px] h-2.5 bg-[var(--bg-secondary)] rounded-full border border-[var(--ink-primary)] overflow-hidden p-0.5">
              <div
                className={`h-full bg-[var(--ink-primary)] rounded-full transition-all duration-400 ease-out ${isAuthenticatedSuccess ? "" : "animate-pulse"}`}
                style={{ width: isAuthenticatedSuccess ? "100%" : "70%" }}
              />
            </div>
            <p className="mt-3 text-[11px] text-[var(--ink-secondary)] font-mono">
              {isAuthenticatedSuccess ? "Verified!" : "Please wait a moment"}
            </p>
          </div>
        ) : (
          /* Standard Sign-In Prompt */
          <>
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
                <span>Continue with Google</span>
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
                <span>Continue with Microsoft</span>
              </button>
            </div>

            {/* Footer Note */}
            <p className="mt-5 text-center text-[11px] text-[var(--ink-secondary)] leading-relaxed">
              Browsing the world atlas is completely free. Pinned memories, likes, and comments stay saved to your personal traveler board.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
