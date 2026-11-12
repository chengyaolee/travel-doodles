"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { DoodlePin, DoodleUnderline } from "@/components/doodles";
import { SketchButton } from "@/components/ui/SketchButton";

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

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "register") {
        if (!customId.trim()) {
          throw new Error("Please enter a Traveler ID (e.g. wanderer_sam)");
        }
        await register({
          custom_id: customId.trim(),
          display_name: displayName.trim() || customId.trim(),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={closeAuthModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-[var(--bg-primary)] border-2 border-[var(--ink-primary)] rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col text-[var(--ink-primary)] overflow-hidden"
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
          ✕
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

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-[var(--bg-secondary)] p-1 border border-[var(--border-color)] mb-5">
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
            <label className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
              Traveler ID <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-secondary)] text-sm font-mono">
                @
              </span>
              <input
                type="text"
                required
                value={customId}
                onChange={(e) => setCustomId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="wanderer_sam"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--ink-primary)] font-mono"
              />
            </div>
            <span className="text-[10px] text-[var(--ink-secondary)]">
              Your unique handle (letters, numbers, underscores)
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
                  placeholder="Collecting sunsets, ramen shops & sketched maps."
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
              {loading ? "Connecting..." : tab === "register" ? "Join the Travel Board 🎒" : "Open Your Board 🗺️"}
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
