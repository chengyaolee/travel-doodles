"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { DoodlePin, DoodleUnderline } from "@/components/doodles";
import { SketchButton } from "@/components/ui/SketchButton";

function generateRandomTag(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `traveler_${suffix}`;
}

export function AuthModal() {
  const { authModalOpen, authModalAction, closeAuthModal, login, register } = useAuth();
  const [tab, setTab] = useState<"register" | "login">("register");

  // Form states
  const [customId, setCustomId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize randomized @handle when modal opens or tab changes to register
  useEffect(() => {
    if (authModalOpen && !customId) {
      setCustomId(generateRandomTag());
    }
  }, [authModalOpen, customId]);

  if (!authModalOpen) return null;

  const handleRandomize = () => {
    setCustomId(generateRandomTag());
  };

  const handleOAuthLogin = (provider: "google" | "microsoft") => {
    window.location.href = `/api/v1/auth/oauth/${provider}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "register") {
        const idToUse = customId.trim() || generateRandomTag();
        await register({
          custom_id: idToUse,
          display_name: displayName.trim() || idToUse,
          bio: bio.trim(),
          password: password.trim() || undefined,
        });
      } else {
        if (!customId.trim()) {
          throw new Error("Please enter your Traveler ID");
        }
        await login(customId.trim(), password.trim() || undefined);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication error occurred.");
    } finally {
      setLoading(false);
    }
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
        className="relative w-full max-w-md bg-[var(--bg-primary)] border-2 border-[var(--ink-primary)] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col text-[var(--ink-primary)] overflow-hidden my-8"
        style={{
          boxShadow: "6px 6px 0px 0px var(--ink-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>

        {/* Header with Needle Pin */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-2">
            <DoodlePin size={38} className="drop-shadow-md" />
          </div>
          <span className="font-hand text-base text-[var(--ink-secondary)]">
            Traveler Passport
          </span>
          <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight">
            {tab === "register" ? "Create Your Traveler Board" : "Welcome Back, Traveler"}
          </h2>
          <DoodleUnderline className="w-36 h-2 text-[var(--ink-primary)] mt-1" />

          {authModalAction && (
            <p className="mt-2 text-xs text-[var(--ink-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--border-color)]">
              Sign in or join to {authModalAction}
            </p>
          )}
        </div>

        {/* OAuth Passwordless Login Buttons (Google & Microsoft) */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center gap-3 text-xs font-semibold text-[var(--ink-primary)] transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            {/* Google Monochrome G Icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("microsoft")}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] flex items-center justify-center gap-3 text-xs font-semibold text-[var(--ink-primary)] transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            {/* Microsoft 4-Quadrant Icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="1" y="1" width="10" height="10" />
              <rect x="13" y="1" width="10" height="10" />
              <rect x="1" y="13" width="10" height="10" />
              <rect x="13" y="13" width="10" height="10" />
            </svg>
            <span>Continue with Microsoft</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-[11px] text-[var(--ink-secondary)] uppercase tracking-wider font-mono">
            or use traveler handle
          </span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-[var(--bg-secondary)] p-1 border border-[var(--border-color)] mb-4">
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "register"
                ? "bg-[var(--bg-primary)] text-[var(--ink-primary)] shadow-sm"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === "login"
                ? "bg-[var(--bg-primary)] text-[var(--ink-primary)] shadow-sm"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
          >
            Log In
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[var(--ink-secondary)]">
                Traveler @ Handle
              </label>
              {tab === "register" && (
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="text-[11px] text-[var(--ink-primary)] hover:underline cursor-pointer flex items-center gap-1 font-mono"
                >
                  Randomize Tag
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-secondary)] text-sm font-mono">
                @
              </span>
              <input
                type="text"
                required
                value={customId}
                onChange={(e) => setCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="traveler_8192"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--ink-primary)] font-mono"
              />
            </div>
            <span className="text-[10px] text-[var(--ink-secondary)] mt-0.5 block">
              Randomized handle. You can change this anytime in profile settings.
            </span>
          </div>

          {tab === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Sam Lee"
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
                  Traveler Motto / Bio (Optional)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Collecting sunsets, local alleys, and sketched maps."
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
              Password {tab === "register" && <span className="font-normal text-[var(--ink-secondary)]">(Optional)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--ink-primary)] font-mono"
            />
          </div>

          <div className="mt-2">
            <SketchButton
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full py-2.5 justify-center text-sm font-semibold cursor-pointer"
            >
              {loading ? "Connecting..." : tab === "register" ? "Create Traveler Account" : "Log In to Board"}
            </SketchButton>
          </div>
        </form>

        {/* Footer Note */}
        <p className="mt-5 text-center text-[11px] text-[var(--ink-secondary)] leading-relaxed">
          Browsing the world atlas is completely free. Pinned memories, likes, and comments stay saved to your personal traveler board.
        </p>
      </div>
    </div>
  );
}
