"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, FriendInviteInspectResult } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import { Brand } from "@/components/layout/Brand";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { InkIcon } from "@/components/ui/InkIcon";
import { PaperGrainOverlay } from "@/components/explore/PaperGrainOverlay";

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { user, requireAuth } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<FriendInviteInspectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    setLoading(true);
    setError(null);

    api.getFriendInvite(code)
      .then((data) => {
        setInviteData(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Friend invite link could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code, user]);

  const handleConfirmAccept = async () => {
    if (!user) {
      requireAuth("accept friend invite", () => {
        // After auth completion, user state updates and re-triggers
      });
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      const res = await api.acceptFriendInvite(code);
      setSuccessMsg(res.message || "Friend added successfully!");
      setTimeout(() => {
        router.push("/explore");
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept friend invite.");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink-primary)] flex flex-col justify-between relative selection:bg-[#d94e34]/20">
      <PaperGrainOverlay />

      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-[var(--border-subtle)] relative z-10">
        <Brand />
        <Link
          href="/explore"
          className="text-xs font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors flex items-center gap-1.5"
        >
          <InkIcon name="globe" size={15} />
          <span>Explore Atlas</span>
        </Link>
      </header>

      {/* Main Invite Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-md bg-[var(--bg-elevated)] border-2 border-[var(--border-color)] rounded-3xl shadow-xl p-6 sm:p-8 relative overflow-hidden">
          {/* Decorative tape on top */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-7 bg-stone-200/90 dark:bg-stone-700/80 rounded-xs shadow-2xs rotate-1" />

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#d94e34] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-hand text-[var(--ink-secondary)] text-center">
                Reading travel invitation...
              </p>
            </div>
          ) : error && !inviteData ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-950/40 text-red-500 flex items-center justify-center">
                <InkIcon name="close" size={24} />
              </div>
              <div>
                <h1 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                  Invite Link Not Found
                </h1>
                <p className="text-xs text-[var(--ink-secondary)] mt-1.5 max-w-xs mx-auto">
                  {error}
                </p>
              </div>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Return to Atlas
              </Link>
            </div>
          ) : inviteData?.is_expired ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                <InkIcon name="clipboard" size={24} />
              </div>
              <div>
                <h1 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                  Friend Link Expired
                </h1>
                <p className="text-xs text-[var(--ink-secondary)] mt-1.5 max-w-xs mx-auto">
                  This travel friend invite has expired. For security, friend invite links remain active for exactly 3 days.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] text-[var(--ink-secondary)]">
                Ask your friend to generate a fresh 3-day invite link from their profile!
              </div>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Back to Atlas
              </Link>
            </div>
          ) : successMsg ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <InkIcon name="check" size={28} />
              </div>
              <div>
                <h1 className="font-hand text-2xl font-bold text-[var(--ink-primary)]">
                  Friendship Confirmed!
                </h1>
                <p className="text-xs text-[var(--ink-secondary)] mt-1">
                  {successMsg}
                </p>
              </div>
              <p className="text-[11px] text-[var(--ink-secondary)]">
                Redirecting to Explore friends feed...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Inviter Badge */}
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#d94e34] bg-[#d94e34]/10 px-2.5 py-1 rounded-full border border-[#d94e34]/20">
                  Friend Invitation
                </span>
                <h1 className="font-hand text-3xl font-bold text-[var(--ink-primary)] mt-3">
                  Let&apos;s Wander Together
                </h1>
                <p className="text-xs text-[var(--ink-secondary)] mt-1">
                  You received an invite to connect as travel friends on the living map.
                </p>
              </div>

              {/* Inviter Profile Card */}
              <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center gap-3.5">
                <AnonymousAvatar
                  name={inviteData?.inviter?.display_name || "Traveler"}
                  avatarUrl={inviteData?.inviter?.avatar_url}
                  size={52}
                  className="border-2 border-[var(--border-color)] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--ink-primary)] truncate">
                    {inviteData?.inviter?.display_name || "Traveler"}
                  </div>
                  <div className="text-xs text-[var(--ink-secondary)] font-mono truncate">
                    @{inviteData?.inviter?.custom_id || "wanderer"}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    <InkIcon name="sparkle" size={11} />
                    <span>Link expires in {inviteData?.expires_in_hours || 72} hours (3-day link)</span>
                  </div>
                </div>
              </div>

              {/* Status & Confirmation Actions */}
              {inviteData?.is_self ? (
                <div className="text-center space-y-3 pt-2">
                  <p className="text-xs text-[var(--ink-secondary)]">
                    This is your own friend invite link. Copy and send it to friends to connect!
                  </p>
                  <Link
                    href="/explore"
                    className="inline-block w-full py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-bold text-[var(--ink-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    Go to Explore Map
                  </Link>
                </div>
              ) : inviteData?.is_friend ? (
                <div className="text-center space-y-3 pt-2">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                    <InkIcon name="check" size={14} />
                    You and @{inviteData?.inviter?.custom_id} are already friends!
                  </p>
                  <Link
                    href="/explore"
                    className="inline-block w-full py-2.5 rounded-xl bg-[#d94e34] text-white text-xs font-bold hover:bg-[#b91c1c] transition-colors"
                  >
                    View Friends Feed
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {!user ? (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--ink-secondary)] text-center">
                        Please sign in or create an account to confirm this friendship with @{inviteData?.inviter?.custom_id}.
                      </p>
                      <button
                        type="button"
                        onClick={() => requireAuth("accept friend invite", handleConfirmAccept)}
                        className="w-full py-3 px-4 rounded-xl bg-[#d94e34] hover:bg-[#b91c1c] text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <InkIcon name="people" size={16} />
                        <span>Sign In to Accept Invite</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-[var(--ink-secondary)] text-center">
                        Confirm connection with <strong>@{inviteData?.inviter?.custom_id}</strong>? You will see each other&apos;s pinned memories and friends feed stories.
                      </p>
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={handleConfirmAccept}
                          disabled={isAccepting}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#d94e34] hover:bg-[#b91c1c] text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isAccepting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <InkIcon name="check" size={16} />
                              <span>Confirm & Add Friend</span>
                            </>
                          )}
                        </button>
                        <Link
                          href="/explore"
                          className="py-3 px-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-xs font-bold transition-colors"
                        >
                          Decline
                        </Link>
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="text-xs text-red-500 text-center font-medium">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] font-hand text-[var(--ink-secondary)] relative z-10">
        Travel Doodles — The living collaborative atlas
      </footer>
    </div>
  );
}
