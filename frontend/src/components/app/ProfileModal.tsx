"use client";

import { useState, useEffect, useRef } from "react";
import { DoodlePin } from "@/components/doodles";
import { TravelDoodlePost } from "./CreatePostModal";
import { WORLD_LAND_PATH, ACCURATE_CITIES } from "@/lib/worldMapData";
import { useAuth } from "@/lib/authContext";
import { api, AuthUser, FriendRequestItem, UserSearchResult } from "@/lib/api";
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
  } | null>(null);
  const [isSavingHandle, setIsSavingHandle] = useState(false);

  // Other Traveler Profile View State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [loadingOther, setLoadingOther] = useState(false);

  // Friends System State
  const [friendsList, setFriendsList] = useState<AuthUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [searchFriendInput, setSearchFriendInput] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [friendActionMsg, setFriendActionMsg] = useState<string | null>(null);
  const [isFriendWithOther, setIsFriendWithOther] = useState(false);
  const [otherFriendRequestPending, setOtherFriendRequestPending] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isViewingSelf = !viewUsername || (user && (viewUsername === user.custom_id || viewUsername === user.username));
  const [selfPosts, setSelfPosts] = useState<TravelDoodlePost[]>([]);

  // Load traveler profile and their posts upon opening
  useEffect(() => {
    if (!isOpen) return;

    if (viewUsername && !isViewingSelf) {
      setLoadingOther(true);
      api.getUserProfile(viewUsername)
        .then((profile) => {
          setOtherUser(profile);
        })
        .catch(() => {
          setOtherUser(null);
        })
        .finally(() => setLoadingOther(false));
    } else if (isViewingSelf && user) {
      const handle = user.custom_id || user.username;
      if (handle) {
        api.getUserProfile(handle)
          .then((profile) => {
            if (profile?.posts && Array.isArray(profile.posts)) {
              setSelfPosts(profile.posts);
            }
          })
          .catch(() => {});
      }
    } else {
      setOtherUser(null);
    }
  }, [isOpen, viewUsername, isViewingSelf, user?.custom_id, user?.username]);

  // Load friends and friend requests
  const refreshFriendsAndRequests = () => {
    if (!isAuthenticated) return;
    api.getFriends()
      .then((list) => {
        setFriendsList(list);
        if (otherUser) {
          setIsFriendWithOther(list.some((f) => f.id === otherUser.id || f.custom_id === otherUser.username));
        }
      })
      .catch(() => setFriendsList([]));

    api.getFriendRequests()
      .then((data) => {
        setIncomingRequests(data.incoming);
        setOutgoingRequests(data.outgoing);
        if (otherUser) {
          setOtherFriendRequestPending(
            data.outgoing.some((r) => r.receiver_id === otherUser.id)
          );
        }
      })
      .catch(() => {
        setIncomingRequests([]);
        setOutgoingRequests([]);
      });
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      refreshFriendsAndRequests();
    }
  }, [isOpen, isAuthenticated, otherUser]);

  // Search friend debouncing
  useEffect(() => {
    const q = searchFriendInput.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setIsSearchingFriends(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(() => {
      setIsSearchingFriends(true);
      api.searchTravelers(q)
        .then((results) => {
          setSearchResults(results);
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearchingFriends(false);
        });
    }, 250);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchFriendInput]);

  // 500ms Debounced validation for handle changes
  useEffect(() => {
    if (!isEditingHandle) {
      setHandleAvailability(null);
      setHandleError(null);
      return;
    }

    const clean = newHandle.toLowerCase().replace(/[^a-z0-9_]/g, "").trim();
    if (!clean) {
      setHandleAvailability(null);
      return;
    }

    if (clean === user?.custom_id) {
      setHandleAvailability({
        available: true,
        valid: true,
        message: "Current handle",
      });
      return;
    }

    setHandleChecking(true);
    const timer = setTimeout(() => {
      api.checkHandle(clean)
        .then((res: { available: boolean; valid: boolean; message: string }) => {
          setHandleAvailability(res);
          if (!res.available) {
            setHandleError(res.message);
          } else {
            setHandleError(null);
          }
        })
        .catch(() => {
          setHandleAvailability(null);
        })
        .finally(() => setHandleChecking(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [newHandle, isEditingHandle, user?.custom_id]);

  if (!isOpen) return null;

  const activeProfile = isViewingSelf
    ? user
    : otherUser
    ? {
        id: otherUser.id,
        custom_id: otherUser.username,
        display_name: otherUser.display_name || otherUser.username,
        bio: otherUser.bio || "Fellow explorer on the whiteboard atlas.",
        avatar_url: otherUser.avatar_url || "",
        created_at: otherUser.created_at || new Date().toISOString(),
      }
    : null;

  const displayedPosts: TravelDoodlePost[] = isViewingSelf
    ? (selfPosts.length > 0
        ? selfPosts
        : userPosts.filter(
            (p) =>
              !user?.custom_id ||
              p.author.toLowerCase() === (user.custom_id || "").toLowerCase() ||
              p.author.toLowerCase() === (user.display_name || "").toLowerCase() ||
              p.author.toLowerCase() === (user.username || "").toLowerCase() ||
              userPosts.length <= 5
          ))
    : otherUser?.posts || [];

  const visitedCountries = Array.from(new Set(displayedPosts.map((p: TravelDoodlePost) => p.country)));
  const uniqueCountries = visitedCountries.length;

  const handleStartEditHandle = () => {
    setNewHandle(user?.custom_id || "");
    setHandleError(null);
    setHandleSuccess(null);
    setIsEditingHandle(true);
  };

  const handleSaveHandle = async () => {
    const clean = newHandle.toLowerCase().replace(/[^a-z0-9_]/g, "").trim();
    if (!clean || clean === user?.custom_id) {
      setIsEditingHandle(false);
      return;
    }

    setIsSavingHandle(true);
    setHandleError(null);
    try {
      const updated = await api.updateCustomId(clean);
      if (user) {
        user.custom_id = updated.custom_id;
        user.username = updated.custom_id;
      }
      setHandleSuccess(`Handle updated to @${updated.custom_id}`);
      setIsEditingHandle(false);
      setTimeout(() => setHandleSuccess(null), 3000);
    } catch (err: unknown) {
      setHandleError(err instanceof Error ? err.message : "Failed to update handle");
    } finally {
      setIsSavingHandle(false);
    }
  };

  // Friend actions
  const handleSendRequest = async (targetCustomId: string) => {
    setActiveActionId(targetCustomId);
    setFriendActionMsg(null);

    requireAuth("send a friend request", async () => {
      try {
        const res = await api.sendFriendRequest(targetCustomId);
        setFriendActionMsg(res.message);
        refreshFriendsAndRequests();
        setSearchResults((prev) =>
          prev.map((u) =>
            u.custom_id === targetCustomId ? { ...u, friendship_status: "pending_sent" } : u
          )
        );
      } catch (err) {
        setFriendActionMsg(err instanceof Error ? err.message : "Could not send friend request.");
      } finally {
        setActiveActionId(null);
      }
    });
  };

  const handleAcceptRequest = async (requestId: string) => {
    setActiveActionId(requestId);
    setFriendActionMsg(null);

    try {
      const friend = await api.acceptFriendRequest(requestId);
      setFriendActionMsg(`Connected with @${friend.custom_id} as travel friends!`);
      refreshFriendsAndRequests();
    } catch (err) {
      setFriendActionMsg(err instanceof Error ? err.message : "Failed to accept friend request.");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setActiveActionId(requestId);
    try {
      await api.declineFriendRequest(requestId);
      setFriendActionMsg("Friend request declined.");
      refreshFriendsAndRequests();
    } catch (err) {
      setFriendActionMsg(err instanceof Error ? err.message : "Failed to decline request.");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setActiveActionId(requestId);
    try {
      await api.cancelFriendRequest(requestId);
      setFriendActionMsg("Friend request cancelled.");
      refreshFriendsAndRequests();
    } catch (err) {
      setFriendActionMsg(err instanceof Error ? err.message : "Failed to cancel request.");
    } finally {
      setActiveActionId(null);
    }
  };

  const handleGenerateInvite = async () => {
    setIsGeneratingInvite(true);
    setFriendActionMsg(null);
    try {
      // 3 days TTL = 72 hours
      const inv = await api.createFriendInvite(72);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${origin}${inv.invite_url}`);
      setInviteExpiresAt(inv.expires_at);
      setFriendActionMsg("Generated friend invite link! Valid for 3 days.");
    } catch (err) {
      setFriendActionMsg(err instanceof Error ? err.message : "Failed to generate invite link.");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    }
  };

  const handleToggleFriendOther = async () => {
    if (!activeProfile) return;

    requireAuth("connect with friends", async () => {
      try {
        if (isFriendWithOther) {
          await api.removeFriend(activeProfile.id);
          setIsFriendWithOther(false);
          setFriendsList((prev) => prev.filter((f) => f.id !== activeProfile.id));
          setFriendActionMsg(`Removed @${activeProfile.custom_id} from friends.`);
        } else {
          await api.sendFriendRequest(activeProfile.custom_id);
          setOtherFriendRequestPending(true);
          setFriendActionMsg(`Friend request sent to @${activeProfile.custom_id}! They will need to accept.`);
          refreshFriendsAndRequests();
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
      setFriendActionMsg("Friend removed.");
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[var(--bg-primary)] border-2 border-[var(--border-color)] rounded-3xl shadow-2xl p-6 sm:p-8 my-8 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-sm font-bold text-[var(--ink-primary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
        >
          <InkIcon name="close" size={16} />
        </button>

        {loadingOther ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#d94e34] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-hand text-[var(--ink-secondary)]">Opening traveler sketchbook...</p>
          </div>
        ) : activeProfile ? (
          <>
            {/* Header: Avatar, Name, Handle, Bio & Log Out / Add Friend */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <AnonymousAvatar
                  name={activeProfile.display_name}
                  avatarUrl={activeProfile.avatar_url}
                  size={64}
                  className="border-2 border-[var(--border-color)] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-hand text-3xl font-bold text-[var(--ink-primary)]">
                      {activeProfile.display_name}
                    </h2>
                  </div>

                  {/* Editable Handle */}
                  {isViewingSelf && isEditingHandle ? (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="relative flex items-center">
                        <span className="absolute left-2 text-xs text-[var(--ink-secondary)] font-mono">@</span>
                        <input
                          type="text"
                          value={newHandle}
                          onChange={(e) => setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                          className="pl-6 pr-2 py-1 text-xs font-mono bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
                          placeholder="wanderer_handle"
                          autoFocus
                          maxLength={30}
                        />
                      </div>
                      <button
                        onClick={handleSaveHandle}
                        disabled={isSavingHandle || handleChecking || (handleAvailability ? !handleAvailability.available : false)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--ink-primary)] text-[var(--bg-primary)] disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingHandle ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setIsEditingHandle(false)}
                        className="px-2 py-1 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-[var(--ink-secondary)] font-mono">
                        @{activeProfile.custom_id}
                      </span>
                      {isViewingSelf && (
                        <button
                          onClick={handleStartEditHandle}
                          className="text-[10px] text-[var(--accent)] hover:underline cursor-pointer ml-1"
                        >
                          Change tag
                        </button>
                      )}
                    </div>
                  )}

                  {handleChecking && (
                    <span className="text-[10px] text-[var(--ink-secondary)] block mt-0.5">Checking availability...</span>
                  )}
                  {handleAvailability && !handleChecking && (
                    <span className={`text-[10px] block mt-0.5 ${handleAvailability.available ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {handleAvailability.message}
                    </span>
                  )}
                  {handleError && (
                    <span className="text-[10px] text-red-500 block mt-0.5">{handleError}</span>
                  )}
                  {handleSuccess && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">{handleSuccess}</span>
                  )}

                  <p className="text-xs text-[var(--ink-secondary)] mt-1.5 max-w-md font-sans">
                    {activeProfile.bio}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Log Out (Self) or Send Friend Request (Other) */}
              <div className="flex items-center gap-2 self-stretch sm:self-center">
                {isViewingSelf ? (
                  <button
                    onClick={async () => {
                      await logout();
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                  >
                    Log Out
                  </button>
                ) : (
                  <button
                    onClick={handleToggleFriendOther}
                    disabled={otherFriendRequestPending}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      isFriendWithOther
                        ? "border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
                        : otherFriendRequestPending
                        ? "border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--ink-secondary)] opacity-70"
                        : "bg-[var(--ink-primary)] text-[var(--bg-primary)] shadow-sm hover:opacity-90"
                    }`}
                  >
                    {isFriendWithOther ? (
                      <>
                        <InkIcon name="check" size={14} />
                        <span>Friends</span>
                      </>
                    ) : otherFriendRequestPending ? (
                      <>
                        <InkIcon name="clipboard" size={14} />
                        <span>Request Pending</span>
                      </>
                    ) : (
                      <span>+ Send Friend Request</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {displayedPosts.length}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider font-semibold">
                  Pinned Memories
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {uniqueCountries}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider font-semibold">
                  Countries Wandered
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {displayedPosts.reduce((acc: number, p: TravelDoodlePost) => acc + (p.likes || 1), 0)}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider font-semibold">
                  Warm Hearts
                </span>
              </div>
              <div className="p-3 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-center">
                <span className="font-hand text-2xl font-bold text-[var(--ink-primary)] block">
                  {isViewingSelf ? friendsList.length : uniqueCountries > 1 ? 1 : 0}
                </span>
                <span className="text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider font-semibold">
                  {isViewingSelf ? "Travel Friends" : "Journeys"}
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
                  className={`px-4 py-1.5 text-xs font-hand text-sm rounded-lg capitalize transition-colors flex items-center gap-1.5 ${
                    tab === t
                      ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] font-bold"
                      : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <span>
                    {t === "board"
                      ? "Doodle Board Map"
                      : t === "photos"
                      ? "Pinned Polaroids"
                      : t === "routes"
                      ? "Journey Log"
                      : "Friends"}
                  </span>
                  {t === "friends" && incomingRequests.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#d94e34] text-white text-[9px] font-mono flex items-center justify-center font-bold">
                      {incomingRequests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === "board" && (
              <div className="relative w-full aspect-[16/9] max-h-[380px] bg-[#fbf8f2] dark:bg-stone-900 border border-[var(--border-color)] rounded-2xl overflow-hidden p-4 flex flex-col justify-between shadow-inner">
                <svg viewBox="0 0 1000 500" className="w-full h-full opacity-40 dark:opacity-20 pointer-events-none">
                  <path d={WORLD_LAND_PATH} fill="currentColor" className="text-stone-300 dark:text-stone-700" />
                </svg>
                {displayedPosts.map((post: TravelDoodlePost, idx: number) => {
                  const cityKey = post.city ? (post.city.toLowerCase() as keyof typeof ACCURATE_CITIES) : undefined;
                  const cityData = cityKey ? ACCURATE_CITIES[cityKey] : undefined;
                  const lon = post.coordinates ? post.coordinates[0] : (cityData ? cityData.coords[0] : null);
                  const lat = post.coordinates ? post.coordinates[1] : (cityData ? cityData.coords[1] : null);
                  const x = lon !== null ? ((lon + 180) * 1000) / 360 : 500 + (idx * 30 - 60);
                  const y = lat !== null ? ((90 - lat) * 500) / 180 : 250 + (idx * 20 - 40);
                  return (
                    <div
                      key={post.id}
                      className="absolute group z-10 cursor-pointer"
                      style={{ left: `${(x / 1000) * 100}%`, top: `${(y / 500) * 100}%` }}
                    >
                      <div className="hover:scale-125 transition-transform duration-200">
                        <DoodlePin size={22} color="#d94e34" filled />
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1 bg-white/95 dark:bg-stone-800/95 border border-stone-200 dark:border-stone-700 rounded-md shadow-md text-[10px] font-bold text-stone-800 dark:text-stone-100 pointer-events-none whitespace-nowrap z-20">
                        {post.city}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === "photos" && (
              displayedPosts.length === 0 ? (
                <div className="py-12 text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6">
                  <p className="text-xs text-[var(--ink-secondary)]">No polaroid memories pinned yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {displayedPosts.map((item: TravelDoodlePost) => (
                    <div
                      key={item.id}
                      className="bg-white p-2 pb-5 rounded-xs shadow-md border border-stone-200 transition-transform hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="aspect-square overflow-hidden bg-neutral-100 rounded-2xs mb-2">
                        <img src={item.image} alt={item.location || item.city} className="w-full h-full object-cover" />
                      </div>
                      <p className="font-hand text-xs text-neutral-800 text-center truncate">
                        {item.location || item.city}
                      </p>
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
                        {displayedPosts.map((p: TravelDoodlePost) => p.city).join(" → ")}
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
                {friendActionMsg && (
                  <div className="p-3 text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-between text-[var(--ink-primary)]">
                    <span>{friendActionMsg}</span>
                    <button
                      onClick={() => setFriendActionMsg(null)}
                      className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    >
                      <InkIcon name="close" size={14} />
                    </button>
                  </div>
                )}

                {/* Section 1: Generate & Share 3-Day Friend Link */}
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)]">
                        <InkIcon name="share" size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--ink-primary)]">
                          Share Friend Link (3-Day TTL)
                        </h4>
                        <p className="text-[11px] text-[var(--ink-secondary)]">
                          Allows anyone with an account to add you (with confirmation by receiver). Link expires in 3 days.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateInvite}
                      disabled={isGeneratingInvite}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-xs font-bold text-[var(--ink-primary)] transition-colors cursor-pointer shrink-0"
                    >
                      {isGeneratingInvite ? "Creating..." : inviteLink ? "Regenerate" : "Create Link"}
                    </button>
                  </div>

                  {inviteLink && (
                    <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteLink}
                          className="flex-1 px-3 py-1.5 text-xs font-mono bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--ink-primary)] select-all"
                        />
                        <button
                          type="button"
                          onClick={handleCopyInvite}
                          className="px-3 py-1.5 rounded-lg bg-[#d94e34] hover:bg-[#b91c1c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          {copiedInvite ? (
                            <>
                              <InkIcon name="check" size={14} />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <InkIcon name="clipboard" size={14} />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        <InkIcon name="sparkle" size={11} />
                        <span>Valid for exactly 3 days (expires {inviteExpiresAt ? new Date(inviteExpiresAt).toLocaleDateString() : "in 72h"})</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Search Friend by ID / Handle & Send Request */}
                <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent)]">
                      <InkIcon name="search" size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--ink-primary)]">
                        Search Friend by ID & Send Request
                      </h4>
                      <p className="text-[11px] text-[var(--ink-secondary)]">
                        Enter a friend&apos;s handle to find them and send a friend request they must accept.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-secondary)] font-mono">
                      @
                    </span>
                    <input
                      type="text"
                      value={searchFriendInput}
                      onChange={(e) => setSearchFriendInput(e.target.value)}
                      placeholder="search_traveler_id_or_name..."
                      className="w-full pl-7 pr-8 py-2 text-xs rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:outline-hidden focus:border-[#d94e34] text-[var(--ink-primary)] font-mono"
                    />
                    {isSearchingFriends && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3.5 h-3.5 border-2 border-[#d94e34] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-xl bg-[var(--bg-primary)] overflow-hidden">
                      {searchResults.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AnonymousAvatar
                              name={t.display_name}
                              avatarUrl={t.avatar_url}
                              size={34}
                              className="border border-[var(--border-color)] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--ink-primary)] truncate">
                                {t.display_name}
                              </div>
                              <div className="text-[10px] text-[var(--ink-secondary)] font-mono truncate">
                                @{t.custom_id}
                              </div>
                            </div>
                          </div>

                          <div>
                            {t.friendship_status === "self" ? (
                              <span className="text-[10px] font-semibold text-[var(--ink-secondary)] px-2 py-1 bg-[var(--bg-secondary)] rounded-md">
                                You
                              </span>
                            ) : t.friendship_status === "friends" ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 rounded-md border border-emerald-200 dark:border-emerald-800">
                                Friends
                              </span>
                            ) : t.friendship_status === "pending_sent" ? (
                              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                                Request Sent
                              </span>
                            ) : t.friendship_status === "pending_received" && t.active_request_id ? (
                              <button
                                onClick={() => handleAcceptRequest(t.active_request_id!)}
                                disabled={activeActionId === t.active_request_id}
                                className="px-2.5 py-1 rounded-lg bg-[#d94e34] hover:bg-[#b91c1c] text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                Accept Request
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendRequest(t.custom_id)}
                                disabled={activeActionId === t.custom_id}
                                className="px-2.5 py-1 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-primary)] hover:opacity-90 text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                {activeActionId === t.custom_id ? "Sending..." : "+ Send Request"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: Incoming Friend Requests (Require Acceptance) */}
                {incomingRequests.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#d94e34] animate-pulse" />
                        <h4 className="text-xs font-bold text-[var(--ink-primary)]">
                          Incoming Friend Requests ({incomingRequests.length})
                        </h4>
                      </div>
                      <span className="text-[10px] text-[var(--ink-secondary)]">
                        Confirmation required
                      </span>
                    </div>

                    <div className="space-y-2">
                      {incomingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AnonymousAvatar
                              name={req.sender?.display_name || "Traveler"}
                              avatarUrl={req.sender?.avatar_url}
                              size={36}
                              className="border border-[var(--border-color)] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--ink-primary)] truncate">
                                {req.sender?.display_name || "Traveler"}
                              </div>
                              <div className="text-[10px] text-[var(--ink-secondary)] font-mono truncate">
                                @{req.sender?.custom_id}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAcceptRequest(req.id)}
                              disabled={activeActionId === req.id}
                              className="px-3 py-1.5 rounded-lg bg-[#d94e34] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                            >
                              {activeActionId === req.id ? "..." : "Accept"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeclineRequest(req.id)}
                              disabled={activeActionId === req.id}
                              className="px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--ink-secondary)] text-xs font-medium transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Outgoing Sent Requests (Pending) */}
                {outgoingRequests.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
                    <h4 className="text-xs font-bold text-[var(--ink-primary)]">
                      Sent Requests Waiting for Acceptance ({outgoingRequests.length})
                    </h4>
                    <div className="space-y-2">
                      {outgoingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-semibold text-[var(--ink-primary)] truncate">
                              @{req.receiver?.custom_id}
                            </span>
                            <span className="text-[10px] text-[var(--ink-secondary)] font-mono">
                              (pending)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id)}
                            disabled={activeActionId === req.id}
                            className="text-[11px] text-[var(--ink-secondary)] hover:text-red-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 5: Mutual Friends List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-[var(--ink-primary)] uppercase tracking-wider">
                      Mutual Friends ({friendsList.length})
                    </h4>
                    <span className="text-[11px] text-[var(--ink-secondary)]">
                      Stories appear in Friends feed
                    </span>
                  </div>

                  {friendsList.length === 0 ? (
                    <div className="py-10 text-center bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-6">
                      <div className="w-10 h-10 mx-auto mb-2 text-stone-400">
                        <InkIcon name="people" size={32} />
                      </div>
                      <h5 className="font-hand text-lg font-bold text-[var(--ink-primary)]">
                        No friends connected yet
                      </h5>
                      <p className="text-xs text-[var(--ink-secondary)] max-w-xs mx-auto mt-1 font-mono">
                        Search another traveler by ID above or send a 3-day friend link to start sharing travel memories!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {friendsList.map((f) => (
                        <div
                          key={f.id}
                          className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AnonymousAvatar
                              name={f.display_name}
                              avatarUrl={f.avatar_url}
                              size={40}
                              className="border border-[var(--border-color)] shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="text-xs font-bold text-[var(--ink-primary)] truncate">
                                {f.display_name}
                              </h5>
                              <span className="text-[10px] text-[var(--ink-secondary)] font-mono truncate block">
                                @{f.custom_id}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFriend(f.id)}
                            className="text-[11px] text-[var(--ink-secondary)] hover:text-red-500 cursor-pointer shrink-0"
                            title="Remove friend"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
