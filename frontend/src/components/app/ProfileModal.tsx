"use client";

import { useState, useEffect } from "react";
import { DoodlePin } from "@/components/doodles";
import { TravelDoodlePost } from "./CreatePostModal";
import { WORLD_LAND_PATH, ACCURATE_CITIES } from "@/lib/worldMapData";
import { useAuth } from "@/lib/authContext";
import { api, AuthUser } from "@/lib/api";
import { AnonymousAvatar } from "@/components/ui/AnonymousAvatar";
import { InkIcon } from "@/components/ui/InkIcon";

export function ProfileModal({
  isOpen,
  onClose,
  userPosts = [],
  viewUsername = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  userPosts?: TravelDoodlePost[];
  viewUsername?: string | null;
}) {
  const [tab, setTab] = useState<"board" | "photos" | "routes" | "friends">("board");
  const { user, isAuthenticated, openAuthModal, logout, requireAuth } = useAuth();

  // Handle Editing State
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleSuccess, setHandleSuccess] = useState<string | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);
  const [handleAvailability, setHandleAvailability] = useState<{
    available: boolean;
    valid?: boolean;
    message: string;
    isCurrent?: boolean;
    isTaken?: boolean;
  } | null>(null);

  // Other Traveler Profile View State
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [loadingOther, setLoadingOther] = useState(false);

  // Friends System State
  const [friendsList, setFriendsList] = useState<AuthUser[]>([]);
  const [addFriendInput, setAddFriendInput] = useState("");
  const [friendActionMsg, setFriendActionMsg] = useState<string | null>(null);
  const [isFriendWithOther, setIsFriendWithOther] = useState(false);

  const isViewingSelf = !viewUsername || (user && (viewUsername === user.custom_id || viewUsername === user.username));

  // Load other user's profile if viewUsername is specified
  useEffect(() => {
    if (isOpen && viewUsername && !isViewingSelf) {
      setLoadingOther(true);
      api.getUserProfile(viewUsername)
        .then((profile) => {
          setOtherUser(profile);
        })
        .catch(() => {
          setOtherUser(null);
        })
        .finally(() => setLoadingOther(false));
    } else {
      setOtherUser(null);
    }
  }, [isOpen, viewUsername, isViewingSelf]);

  // Load friends list when user is authenticated
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      api.getFriends()
        .then((list) => {
          setFriendsList(list);
          if (otherUser) {
            setIsFriendWithOther(list.some((f) => f.id === otherUser.id || f.custom_id === otherUser.username));
          }
        })
        .catch(() => setFriendsList([]));
    }
  }, [isOpen, isAuthenticated, otherUser]);

  // 500ms Debounced validation for handle changes
  useEffect(() => {
    if (!isEditingHandle) {
      setHandleAvailability(null);
      setHandleChecking(false);
      return;
    }

    const clean = newHandle.trim().replace(/^@/, "").toLowerCase();
    if (!clean) {
      setHandleAvailability(null);
      setHandleChecking(false);
      return;
    }

    if (clean === user?.custom_id?.toLowerCase()) {
      setHandleAvailability({
        available: true,
        isCurrent: true,
        message: "Current handle",
      });
      setHandleChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      setHandleAvailability({
        available: false,
        valid: false,
        message: "Must be 3-30 letters, numbers, or underscores.",
      });
      setHandleChecking(false);
      return;
    }

    setHandleChecking(true);
    const timer = setTimeout(() => {
      api.checkHandle(clean)
        .then((res) => {
          setHandleAvailability(res);
        })
        .catch((err) => {
          setHandleAvailability({
            available: false,
            valid: false,
            message: err.message || "Failed to check handle availability",
          });
        })
        .finally(() => {
          setHandleChecking(false);
        });
    }, 500);

    return () => clearTimeout(timer);
  }, [newHandle, isEditingHandle, user?.custom_id]);

  if (!isOpen) return null;

  // Active traveler profile being viewed
  const activeProfile = isViewingSelf
    ? user
    : otherUser
    ? {
        id: otherUser.id,
        custom_id: otherUser.username || otherUser.custom_id,
        username: otherUser.username || otherUser.custom_id,
        display_name: otherUser.name || otherUser.display_name || otherUser.username,
        bio: otherUser.bio || "Traveler on the digital whiteboard.",
        avatar_url: otherUser.avatar || otherUser.avatar_url || "",
      }
    : null;

  // Filter posts created by this profile
  const displayedPosts = activeProfile
    ? userPosts.filter(
        (p) =>
          p.author === activeProfile.display_name ||
          p.author === activeProfile.username ||
          p.author === activeProfile.custom_id
      )
    : [];

  const userPhotos = displayedPosts
    .filter((p) => Boolean(p.image))
    .map((p) => ({ src: p.image, loc: p.location || `${p.city}, ${p.country}` }));

  const uniqueCountries = new Set(displayedPosts.map((p) => p.country).filter(Boolean)).size;

  const handleSaveNewHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandleError(null);
    setHandleSuccess(null);

    const clean = newHandle.trim().replace(/^@/, "").toLowerCase();
    if (!clean) return;

    try {
      const res = await api.updateCustomId(clean);
      if (user) {
        user.custom_id = res.custom_id;
        user.username = res.custom_id;
      }
      setHandleSuccess(`Handle updated to @${res.custom_id}`);
      setIsEditingHandle(false);
      setNewHandle("");
      setHandleAvailability(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update handle.";
      setHandleError(msg);
      // If someone claimed the handle concurrently
      if ((err as any)?.isConflict) {
        setHandleAvailability({
          available: false,
          isTaken: true,
          message: "Another traveler just claimed this handle. Please choose a different one.",
        });
      }
    }
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendActionMsg(null);
    const target = addFriendInput.trim().replace(/^@/, "");
    if (!target) return;

    requireAuth("add friends", async () => {
      try {
        const added = await api.addFriend(target);
        setFriendsList((prev) => [added, ...prev.filter((f) => f.id !== added.id)]);
        setFriendActionMsg(`Added @${added.custom_id} as friend!`);
        setAddFriendInput("");
      } catch (err: unknown) {
        setFriendActionMsg(err instanceof Error ? err.message : "Could not add friend.");
      }
    });
  };

  const handleToggleFriendOther = async () => {
    if (!activeProfile) return;

    requireAuth("add friends", async () => {
      try {
        if (isFriendWithOther) {
          await api.removeFriend(activeProfile.id);
          setIsFriendWithOther(false);
          setFriendsList((prev) => prev.filter((f) => f.id !== activeProfile.id));
        } else {
          const added = await api.addFriend(activeProfile.custom_id);
          setIsFriendWithOther(true);
          setFriendsList((prev) => [added, ...prev]);
        }
      } catch (err: unknown) {
        setFriendActionMsg(err instanceof Error ? err.message : "Friend action failed.");
      }
    });
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await api.removeFriend(friendId);
      setFriendsList((prev) => prev.filter((f) => f.id !== friendId));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-xs font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] cursor-pointer"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>

        {loadingOther ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--ink-primary)] border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-[var(--ink-secondary)] font-mono">Loading traveler profile...</p>
          </div>
        ) : activeProfile ? (
          <>
            {/* Profile Board Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[var(--border-color)]">
              {/* Anonymous / Profile Avatar */}
              <div className="relative">
                <AnonymousAvatar
                  src={activeProfile.avatar_url}
                  alt={activeProfile.display_name}
                  size={96}
                  className="shadow-md"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <h2 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
                    {activeProfile.display_name}
                  </h2>

                  {/* Handle & Edit Action */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--ink-secondary)]">
                      @{activeProfile.custom_id}
                    </span>
                    {isViewingSelf && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingHandle(!isEditingHandle);
                          setNewHandle(activeProfile.custom_id);
                          setHandleError(null);
                        }}
                        className="text-[11px] text-[var(--ink-primary)] hover:underline cursor-pointer font-mono"
                        title="Change your randomized @handle"
                      >
                        [Edit]
                      </button>
                    )}
                  </div>
                </div>

                {/* Handle Edit Form with 500ms Debounced Validation */}
                {isEditingHandle && isViewingSelf && (
                  <form onSubmit={handleSaveNewHandle} className="mt-3 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs text-[var(--ink-secondary)] font-mono">@</span>
                        <input
                          type="text"
                          value={newHandle}
                          onChange={(e) => setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          placeholder="new_handle"
                          className="pl-6 pr-8 py-1 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-hidden focus:border-[var(--ink-primary)] font-mono w-44"
                        />
                        {handleChecking && (
                          <span className="absolute right-2 text-[10px] text-[var(--ink-secondary)] animate-pulse font-mono">
                            ...
                          </span>
                        )}
                        {!handleChecking && handleAvailability?.available && !handleAvailability?.isCurrent && (
                          <span className="absolute right-2 text-green-600 dark:text-green-400">
                            <InkIcon name="check" size={13} />
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={
                          handleChecking ||
                          (handleAvailability !== null && !handleAvailability.available) ||
                          newHandle.trim() === activeProfile.custom_id
                        }
                        className="px-3 py-1 bg-[var(--ink-primary)] text-[var(--bg-primary)] rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingHandle(false);
                          setHandleError(null);
                          setHandleAvailability(null);
                        }}
                        className="px-2 py-1 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Live Debounce Validation Feedback */}
                    {handleChecking && (
                      <p className="text-[11px] text-[var(--ink-secondary)] font-mono">
                        Checking availability...
                      </p>
                    )}
                    {!handleChecking && handleAvailability && (
                      <p
                        className={`text-[11px] font-mono flex items-center gap-1 ${
                          handleAvailability.available
                            ? handleAvailability.isCurrent
                              ? "text-[var(--ink-secondary)]"
                              : "text-green-600 dark:text-green-400 font-semibold"
                            : "text-red-500 font-medium"
                        }`}
                      >
                        {handleAvailability.available && !handleAvailability.isCurrent && (
                          <InkIcon name="check" size={12} />
                        )}
                        <span>{handleAvailability.message}</span>
                      </p>
                    )}
                  </form>
                )}

                {handleError && <p className="text-[11px] text-red-500 mt-1">{handleError}</p>}
                {handleSuccess && <p className="text-[11px] text-green-600 mt-1">{handleSuccess}</p>}

                <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-2 max-w-lg leading-relaxed">
                  {activeProfile.bio}
                </p>
              </div>

              {/* Action Buttons: Log Out (Self) or Add Friend (Other) */}
              <div className="flex items-center gap-2">
                {isViewingSelf ? (
                  <button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  >
                    Log Out
                  </button>
                ) : (
                  <button
                    onClick={handleToggleFriendOther}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      isFriendWithOther
                        ? "border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
                        : "bg-[var(--ink-primary)] text-[var(--bg-primary)] shadow-sm hover:opacity-90"
                    }`}
                  >
                    {isFriendWithOther ? (
                      <>
                        <InkIcon name="check" size={14} />
                        <span>Friends</span>
                      </>
                    ) : (
                      <span>+ Add Friend</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {uniqueCountries}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  Countries
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {displayedPosts.length}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  Memories
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {userPhotos.length}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  Photographs
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {isViewingSelf ? friendsList.length : uniqueCountries > 1 ? 1 : 0}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase font-mono">
                  {isViewingSelf ? "Friends" : "Journeys"}
                </span>
              </div>
            </div>

            {/* Tab switch */}
            <div className="flex gap-2 border-b border-[var(--border-color)] pb-3 mb-6">
              {(isViewingSelf
                ? (["board", "photos", "routes", "friends"] as const)
                : (["board", "photos", "routes"] as const)
              ).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 text-xs font-hand text-sm rounded-lg capitalize transition-colors ${
                    tab === t
                      ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] font-bold"
                      : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {t === "board"
                    ? "Doodle Board Map"
                    : t === "photos"
                    ? "Pinned Polaroids"
                    : t === "routes"
                    ? "Journey Log"
                    : "Friends List"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === "board" && (
              <div className="relative aspect-[1000/560] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 1000 560" fill="none">
                  <path
                    d={WORLD_LAND_PATH}
                    stroke="var(--stroke-color)"
                    strokeWidth="1.2"
                    strokeDasharray="4 3"
                    fill="var(--bg-elevated)"
                    opacity="0.7"
                  />
                  {displayedPosts.map((post) => {
                    let cx = 500;
                    let cy = 280;
                    const cityKey = (post.city || "").toLowerCase().trim();
                    if (ACCURATE_CITIES[cityKey as keyof typeof ACCURATE_CITIES]) {
                      cx = ACCURATE_CITIES[cityKey as keyof typeof ACCURATE_CITIES].x;
                      cy = ACCURATE_CITIES[cityKey as keyof typeof ACCURATE_CITIES].y;
                    } else if (post.coordinates && post.coordinates.length >= 2) {
                      const lng = post.coordinates[0];
                      const lat = Math.max(-80, Math.min(84, post.coordinates[1]));
                      cx = ((lng + 180) / 360) * 1000;
                      cy = 280 - (lat / 90) * 230;
                    }
                    return (
                      <g key={post.id}>
                        <circle cx={cx} cy={cy} r="5" fill="var(--ink-primary)" />
                        <circle cx={cx} cy={cy} r="9" stroke="var(--ink-primary)" strokeWidth="1" opacity="0.3" />
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute bottom-4 left-4 font-hand text-xs text-[var(--ink-secondary)] bg-[var(--bg-primary)] px-2.5 py-1 rounded-md border border-[var(--border-color)]">
                  {displayedPosts.length} pinned memories on this board
                </div>
              </div>
            )}

            {tab === "photos" && (
              userPhotos.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6">
                  <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                    No Polaroids Pinned Yet
                  </h4>
                  <p className="text-xs text-[var(--ink-secondary)] max-w-xs mt-1 font-mono">
                    Capture memories with photos to build your visual travel wall!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {userPhotos.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white p-2 pb-6 rounded-xs shadow-md border border-neutral-200 transition-transform hover:-translate-y-1 hover:shadow-lg"
                      style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 2}deg)` }}
                    >
                      <div className="aspect-square overflow-hidden bg-neutral-100 rounded-2xs mb-2">
                        <img src={item.src} alt={item.loc} className="w-full h-full object-cover" />
                      </div>
                      <p className="font-hand text-xs text-neutral-800 text-center truncate">{item.loc}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "routes" && (
              displayedPosts.length === 0 ? (
                <div className="py-12 text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6">
                  <p className="text-xs text-[var(--ink-secondary)]">No journeys recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                    <div>
                      <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                        Connected Travel Path
                      </h4>
                      <p className="text-xs text-[var(--ink-secondary)] font-mono mt-0.5">
                        {displayedPosts.map((p) => p.city).join(" → ")}
                      </p>
                    </div>
                    <span className="font-hand text-xs text-[var(--ink-secondary)]">
                      {displayedPosts.length} stops
                    </span>
                  </div>
                </div>
              )
            )}

            {/* Friends Tab */}
            {tab === "friends" && isViewingSelf && (
              <div className="space-y-6">
                {/* Add Friend Form */}
                <form onSubmit={handleAddFriendSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-secondary)] font-mono">@</span>
                    <input
                      type="text"
                      value={addFriendInput}
                      onChange={(e) => setAddFriendInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="friend_travel_tag"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--ink-primary)] font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--ink-primary)] text-[var(--bg-primary)] rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add Friend
                  </button>
                </form>

                {friendActionMsg && (
                  <p className="text-xs text-[var(--ink-primary)] bg-[var(--bg-secondary)] p-2 rounded-lg border border-[var(--border-color)]">
                    {friendActionMsg}
                  </p>
                )}

                {/* Friends List */}
                {friendsList.length === 0 ? (
                  <div className="py-12 text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6">
                    <h4 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                      No friends connected yet
                    </h4>
                    <p className="text-xs text-[var(--ink-secondary)] max-w-xs mx-auto mt-1 font-mono">
                      Type another traveler&apos;s @handle above to follow their journeys and see their stories in the Friends feed!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friendsList.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <AnonymousAvatar src={f.avatar_url} alt={f.display_name} size={40} />
                          <div>
                            <h5 className="text-xs font-bold text-[var(--ink-primary)]">
                              {f.display_name}
                            </h5>
                            <span className="text-[10px] text-[var(--ink-secondary)] font-mono">
                              @{f.custom_id}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveFriend(f.id)}
                          className="text-[11px] text-[var(--ink-secondary)] hover:text-red-500 cursor-pointer"
                          title="Remove friend"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Guest State: Prompt Account Creation / Login */
          <div className="py-12 px-6 text-center flex flex-col items-center">
            <h3 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
              Your personal travel board
            </h3>
            <p className="text-xs text-[var(--ink-secondary)] max-w-sm mt-2 mb-6 leading-relaxed font-sans">
              Sign in or create a traveler account to view your pinned memories, record countries you visit, and connect with travel friends.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onClose();
                  openAuthModal("open your traveler board");
                }}
                className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--bg-primary)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-md cursor-pointer"
              >
                Log In or Join
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
