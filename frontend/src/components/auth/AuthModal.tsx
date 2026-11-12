"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { DoodlePin, DoodleUnderline } from "@/components/doodles";
import { InkIcon } from "@/components/ui/InkIcon";

export function AuthModal() {
  const { authModalOpen, authModalAction, closeAuthModal, openAuthModal, login, register } = useAuth();
  const [tab, setTab] = useState<"signin" | "register">("signin");

  // Sign In state
  const [signInHandle, setSignInHandle] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);

  // Register state
  const [registerHandle, setRegisterHandle] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerBio, setRegisterBio] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // Global & OAuth state
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<"google" | "microsoft" | null>(null);

  // Auto-detect auth_error or requested mode from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error") || params.get("error");

    if (authError) {
      if (authError.includes("google_oauth_not_configured")) {
        setError(
          "Google OAuth is not configured on this deployment yet (missing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET). You can sign in or register instantly with a Traveler ID below!"
        );
      } else if (authError.includes("microsoft_oauth_not_configured")) {
        setError(
          "Microsoft OAuth is not configured on this deployment yet (missing MICROSOFT_CLIENT_ID). You can sign in or register instantly with a Traveler ID below!"
        );
      } else if (authError.includes("cancelled") || authError.includes("access_denied")) {
        setError("OAuth sign in was cancelled. You can sign in with your Traveler ID instead.");
      } else {
        setError(`OAuth sign in failed (${authError}). You can sign in or register with your Traveler ID.`);
      }
      openAuthModal("complete your authentication");
    }
  }, [openAuthModal]);

  // Sync tab with modal action when opened
  useEffect(() => {
    if (authModalAction.includes("create") || authModalAction.includes("join") || authModalAction.includes("claim")) {
      setTab("register");
    } else {
      setTab("signin");
    }
    setError(null);
  }, [authModalAction, authModalOpen]);

  if (!authModalOpen) return null;

  const handleOAuthLogin = (provider: "google" | "microsoft") => {
    setError(null);
    setConnecting(provider);
    window.location.href = `/api/v1/auth/oauth/${provider}`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = signInHandle.replace(/^@/, "").trim();
    if (!cleanHandle) {
      setError("Please enter your Traveler ID.");
      return;
    }

    setError(null);
    setSignInLoading(true);
    try {
      await login(cleanHandle);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Account not found.";
      setError(`${msg} If you do not have an account yet, switch to 'Create Account' above!`);
    } finally {
      setSignInLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHandle = registerHandle.replace(/^@/, "").trim();
    const cleanName = registerName.trim();

    if (!cleanHandle) {
      setError("Please choose a Traveler ID (e.g. chengyao).");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanHandle)) {
      setError("Traveler ID must be 3-30 letters, numbers, or underscores (no spaces).");
      return;
    }

    setError(null);
    setRegisterLoading(true);
    try {
      await register({
        custom_id: cleanHandle,
        display_name: cleanName || cleanHandle,
        bio: registerBio.trim(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(msg);
    } finally {
      setRegisterLoading(false);
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
        className="relative w-full max-w-sm sm:max-w-md bg-[var(--bg-primary)] border-2 border-[var(--ink-primary)] rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col text-[var(--ink-primary)] overflow-hidden my-8"
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

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-2">
            <DoodlePin size={38} className="drop-shadow-md" filled />
          </div>
          <span className="font-hand text-sm text-[var(--ink-secondary)]">
            Traveler Passport
          </span>
          <h2 id="auth-modal-title" className="text-2xl font-bold tracking-tight">
            {tab === "signin" ? "Sign In to Passport" : "Create Traveler Passport"}
          </h2>
          <DoodleUnderline className="w-36 h-2 text-[var(--ink-primary)] mt-1" />

          {authModalAction && (
            <p className="mt-2.5 text-xs text-[var(--ink-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--border-color)]">
              To {authModalAction}
            </p>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mb-4">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              tab === "signin"
                ? "bg-[var(--bg-primary)] text-[var(--ink-primary)] shadow-xs border border-[var(--border-color)]"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              tab === "register"
                ? "bg-[var(--bg-primary)] text-[var(--ink-primary)] shadow-xs border border-[var(--border-color)]"
                : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Passwordless Form */}
        {tab === "signin" ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <div>
              <label htmlFor="signin-handle" className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
                Your Traveler ID
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-[var(--ink-secondary)] select-none">
                  @
                </span>
                <input
                  id="signin-handle"
                  type="text"
                  value={signInHandle}
                  onChange={(e) => setSignInHandle(e.target.value)}
                  placeholder="chengyao"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)]/50 focus:outline-hidden focus:border-[var(--ink-primary)] transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={signInLoading || !signInHandle.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] hover:opacity-95 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {signInLoading ? "Opening Passport..." : "Sign In with Traveler ID"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <div>
              <label htmlFor="register-handle" className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
                Choose Traveler ID <span className="text-[10px] text-[var(--ink-secondary)] font-normal">(letters, numbers, _)</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-[var(--ink-secondary)] select-none">
                  @
                </span>
                <input
                  id="register-handle"
                  type="text"
                  value={registerHandle}
                  onChange={(e) => setRegisterHandle(e.target.value)}
                  placeholder="chengyao"
                  maxLength={30}
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)]/50 focus:outline-hidden focus:border-[var(--ink-primary)] transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-name" className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
                Display Name
              </label>
              <input
                id="register-name"
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                placeholder="Cheng Yao"
                maxLength={40}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)]/50 focus:outline-hidden focus:border-[var(--ink-primary)] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="register-bio" className="block text-xs font-semibold text-[var(--ink-secondary)] mb-1">
                Traveler Motto <span className="text-[10px] text-[var(--ink-secondary)] font-normal">(optional)</span>
              </label>
              <input
                id="register-bio"
                type="text"
                value={registerBio}
                onChange={(e) => setRegisterBio(e.target.value)}
                placeholder="Wandering the world one doodle at a time"
                maxLength={80}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-secondary)]/50 focus:outline-hidden focus:border-[var(--ink-primary)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={registerLoading || !registerHandle.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] hover:opacity-95 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {registerLoading ? "Creating Passport..." : "Create Traveler Passport"}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-color)]" />
          </div>
          <span className="relative bg-[var(--bg-primary)] px-3 text-[11px] font-hand text-[var(--ink-secondary)]">
            or connect with
          </span>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-2">
          {/* Continue with Google */}
          <button
            type="button"
            disabled={connecting !== null}
            onClick={() => handleOAuthLogin("google")}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--ink-primary)] flex items-center justify-center gap-3 text-xs font-semibold text-[var(--ink-primary)] transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
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
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--ink-primary)] flex items-center justify-center gap-3 text-xs font-semibold text-[var(--ink-primary)] transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
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
        <p className="mt-4 text-center text-[10px] text-[var(--ink-secondary)] leading-relaxed">
          Passwordless passport: your unique Traveler ID keeps your pinned memories, likes, and doodled paths saved.
        </p>
      </div>
    </div>
  );
}
