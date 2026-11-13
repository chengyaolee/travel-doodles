import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface RequestLike {
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };
  headers: {
    get: (name: string) => string | null;
  };
}

export interface UserRecord {
  id: string;
  custom_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  auth_provider?: string;
  auth_provider_id?: string;
  created_at: string;
  updated_at: string;
}

export class HandleConflictError extends Error {
  constructor(message = "This handle was just claimed by another traveler. Please choose a different one.") {
    super(message);
    this.name = "HandleConflictError";
  }
}

export class HandleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandleValidationError";
  }
}

let handleUpdateMutex = Promise.resolve();

export interface SessionRecord {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface SafeUser {
  id: string;
  custom_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  auth_provider?: string;
  created_at: string;
  updated_at: string;
}

export interface FriendRelation {
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface FriendRequestRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface FriendInviteRecord {
  id: string;
  code: string;
  inviter_id: string;
  max_uses: number;
  uses_count: number;
  expires_at: string; // ISO string (TTL 3 days = 72 hours)
  created_at: string;
}

export interface UserSearchResult extends SafeUser {
  friendship_status: "self" | "friends" | "pending_sent" | "pending_received" | "none";
  active_request_id?: string;
}

function resolveDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  const cwd = process.cwd();
  // Always canonicalize to frontend/.data to ensure single source of truth across workers
  const candidates = [
    path.resolve(cwd, "frontend", ".data"),
    path.resolve(cwd, ".data"),
    path.resolve(cwd, "..", "frontend", ".data"),
    path.resolve(cwd, "..", ".data"),
  ];

  // Prioritize frontend/.data if it exists
  for (const c of candidates) {
    if (c.includes(path.join("frontend", ".data")) && fs.existsSync(c)) {
      return c;
    }
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  const directPath = path.resolve(cwd, "frontend", ".data");
  if (!fs.existsSync(directPath)) {
    try {
      fs.mkdirSync(directPath, { recursive: true });
    } catch {
      // ignore
    }
  }
  return directPath;
}

const DATA_DIR = resolveDataDir();
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const FRIENDS_FILE = path.join(DATA_DIR, "friends.json");
const REQUESTS_FILE = path.join(DATA_DIR, "friend_requests.json");
const INVITES_FILE = path.join(DATA_DIR, "friend_invites.json");

// In-memory cache with mtime validation to prevent stale cache across worker threads
let cachedUsers: UserRecord[] | null = null;
let usersMtime = 0;
let cachedSessions: Record<string, SessionRecord> | null = null;
let sessionsMtime = 0;
let cachedFriends: FriendRelation[] | null = null;
let friendsMtime = 0;
let cachedRequests: FriendRequestRecord[] | null = null;
let requestsMtime = 0;
let cachedInvites: FriendInviteRecord[] | null = null;
let invitesMtime = 0;

function loadUsers(): UserRecord[] {
  if (fs.existsSync(USERS_FILE)) {
    try {
      const stat = fs.statSync(USERS_FILE);
      if (cachedUsers && stat.mtimeMs === usersMtime) {
        return cachedUsers;
      }
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        cachedUsers = parsed;
        usersMtime = stat.mtimeMs;
        return cachedUsers!;
      }
    } catch {
      // If reading/parsing momentarily fails (e.g. concurrent atomic write), keep existing cache
      if (cachedUsers && cachedUsers.length > 0) {
        return cachedUsers;
      }
    }
  }
  if (!cachedUsers) {
    cachedUsers = [];
  }
  return cachedUsers;
}

function saveUsers(users: UserRecord[]) {
  cachedUsers = users;
  const tmpFile = `${USERS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(users, null, 2), "utf-8");
    fs.renameSync(tmpFile, USERS_FILE);
    try {
      usersMtime = fs.statSync(USERS_FILE).mtimeMs;
    } catch {
      // ignore
    }
  } catch {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
      try {
        usersMtime = fs.statSync(USERS_FILE).mtimeMs;
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }
}

function loadSessions(): Record<string, SessionRecord> {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const stat = fs.statSync(SESSIONS_FILE);
      if (cachedSessions && stat.mtimeMs === sessionsMtime) {
        return cachedSessions;
      }
      const data = fs.readFileSync(SESSIONS_FILE, "utf-8");
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        cachedSessions = parsed;
        sessionsMtime = stat.mtimeMs;
        return cachedSessions!;
      }
    } catch {
      // If reading/parsing momentarily fails (e.g. concurrent atomic write), keep existing cache
      if (cachedSessions && Object.keys(cachedSessions).length > 0) {
        return cachedSessions;
      }
    }
  }
  if (!cachedSessions) {
    cachedSessions = {};
  }
  return cachedSessions;
}

function saveSessions(sessions: Record<string, SessionRecord>) {
  cachedSessions = sessions;
  const tmpFile = `${SESSIONS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(sessions, null, 2), "utf-8");
    fs.renameSync(tmpFile, SESSIONS_FILE);
    try {
      sessionsMtime = fs.statSync(SESSIONS_FILE).mtimeMs;
    } catch {
      // ignore
    }
  } catch {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
      try {
        sessionsMtime = fs.statSync(SESSIONS_FILE).mtimeMs;
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }
}

function loadFriends(): FriendRelation[] {
  if (fs.existsSync(FRIENDS_FILE)) {
    try {
      const stat = fs.statSync(FRIENDS_FILE);
      if (cachedFriends && stat.mtimeMs === friendsMtime) {
        return cachedFriends;
      }
      const data = fs.readFileSync(FRIENDS_FILE, "utf-8");
      cachedFriends = JSON.parse(data);
      friendsMtime = stat.mtimeMs;
      return cachedFriends!;
    } catch {
      // ignore
    }
  }
  cachedFriends = [];
  return cachedFriends;
}

function saveFriends(friends: FriendRelation[]) {
  cachedFriends = friends;
  try {
    fs.writeFileSync(FRIENDS_FILE, JSON.stringify(friends, null, 2), "utf-8");
    try {
      friendsMtime = fs.statSync(FRIENDS_FILE).mtimeMs;
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

function loadRequests(): FriendRequestRecord[] {
  if (fs.existsSync(REQUESTS_FILE)) {
    try {
      const stat = fs.statSync(REQUESTS_FILE);
      if (cachedRequests && stat.mtimeMs === requestsMtime) {
        return cachedRequests;
      }
      const data = fs.readFileSync(REQUESTS_FILE, "utf-8");
      cachedRequests = JSON.parse(data);
      requestsMtime = stat.mtimeMs;
      return cachedRequests!;
    } catch {
      // ignore
    }
  }
  cachedRequests = [];
  return cachedRequests;
}

function saveRequests(requests: FriendRequestRecord[]) {
  cachedRequests = requests;
  try {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), "utf-8");
    try {
      requestsMtime = fs.statSync(REQUESTS_FILE).mtimeMs;
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

function loadInvites(): FriendInviteRecord[] {
  if (fs.existsSync(INVITES_FILE)) {
    try {
      const stat = fs.statSync(INVITES_FILE);
      if (cachedInvites && stat.mtimeMs === invitesMtime) {
        return cachedInvites;
      }
      const data = fs.readFileSync(INVITES_FILE, "utf-8");
      cachedInvites = JSON.parse(data);
      invitesMtime = stat.mtimeMs;
      return cachedInvites!;
    } catch {
      // ignore
    }
  }
  cachedInvites = [];
  return cachedInvites;
}

function saveInvites(invites: FriendInviteRecord[]) {
  cachedInvites = invites;
  try {
    fs.writeFileSync(INVITES_FILE, JSON.stringify(invites, null, 2), "utf-8");
    try {
      invitesMtime = fs.statSync(INVITES_FILE).mtimeMs;
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

export function generateRandomCustomId(prefix = "traveler"): string {
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  return `${prefix}_${randomSuffix}`;
}

export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    custom_id: user.custom_id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url || "",
    auth_provider: user.auth_provider,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export const userStore = {
  getUsers(): UserRecord[] {
    return loadUsers();
  },

  findById(id: string): UserRecord | null {
    const users = loadUsers();
    return users.find((u) => u.id === id) || null;
  },

  findByCustomId(customId: string): UserRecord | null {
    const users = loadUsers();
    const normalized = customId.trim().toLowerCase();
    return (
      users.find(
        (u) =>
          u.custom_id.toLowerCase() === normalized ||
          u.username.toLowerCase() === normalized
      ) || null
    );
  },

  findByOAuth(provider: string, providerId: string): UserRecord | null {
    const users = loadUsers();
    return (
      users.find(
        (u) => u.auth_provider === provider && u.auth_provider_id === providerId
      ) || null
    );
  },

  checkHandleAvailability(candidate: string, currentUserId?: string): {
    available: boolean;
    valid: boolean;
    message: string;
    isCurrent?: boolean;
    isTaken?: boolean;
  } {
    const clean = candidate.trim().toLowerCase();
    if (!clean) {
      return { available: false, valid: false, message: "Handle cannot be empty." };
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      return {
        available: false,
        valid: false,
        message: "Handle must be 3-30 letters, numbers, or underscores.",
      };
    }

    // Fresh read from storage to prevent stale data
    cachedUsers = null;
    const users = loadUsers();
    const existing = users.find(
      (u) => u.custom_id.toLowerCase() === clean || u.username.toLowerCase() === clean
    );

    if (!existing) {
      return { available: true, valid: true, message: "Handle is available!" };
    }

    if (currentUserId && existing.id === currentUserId) {
      return { available: true, valid: true, isCurrent: true, message: "This is your current handle." };
    }

    return {
      available: false,
      valid: true,
      isTaken: true,
      message: "This handle is already taken by another traveler.",
    };
  },

  createUser(params: {
    custom_id?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
    auth_provider?: string;
    auth_provider_id?: string;
  }): SafeUser {
    const users = loadUsers();

    // The @ id is randomised first if not provided
    let cleanCustomId = (params.custom_id || "").trim();
    if (!cleanCustomId) {
      let candidate = generateRandomCustomId();
      while (this.findByCustomId(candidate)) {
        candidate = generateRandomCustomId();
      }
      cleanCustomId = candidate;
    } else {
      if (this.findByCustomId(cleanCustomId)) {
        throw new Error(`The custom ID '${cleanCustomId}' is already taken.`);
      }
    }

    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: "usr_" + crypto.randomUUID(),
      custom_id: cleanCustomId,
      username: cleanCustomId,
      display_name: params.display_name?.trim() || cleanCustomId,
      bio: params.bio?.trim() || "Wandering the world one doodle at a time.",
      avatar_url: params.avatar_url || "", // Anonymous silhouette by default
      auth_provider: params.auth_provider,
      auth_provider_id: params.auth_provider_id,
      created_at: now,
      updated_at: now,
    };

    users.push(newUser);
    saveUsers(users);
    return toSafeUser(newUser);
  },

  updateCustomId(userId: string, newCustomId: string): SafeUser {
    const clean = newCustomId.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      throw new HandleValidationError("Handle must be 3-30 characters (letters, numbers, underscores only).");
    }

    // Force fresh load from storage to eliminate stale cache across concurrent calls
    cachedUsers = null;
    const users = loadUsers();

    // Check for collision: if another user claimed this handle concurrently
    const conflict = users.find(
      (u) =>
        (u.custom_id.toLowerCase() === clean || u.username.toLowerCase() === clean) &&
        u.id !== userId
    );

    if (conflict) {
      throw new HandleConflictError(
        `The handle '@${clean}' was just claimed by another traveler. Please choose a different one.`
      );
    }

    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error("Traveler account not found.");

    user.custom_id = clean;
    user.username = clean;
    user.updated_at = new Date().toISOString();

    saveUsers(users);
    return toSafeUser(user);
  },

  createSession(userId: string, customToken?: string): string {
    const sessions = loadSessions();
    const token = customToken || ("sess_" + crypto.randomBytes(32).toString("hex"));
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    sessions[token] = {
      token,
      user_id: userId,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    saveSessions(sessions);
    return token;
  },

  validateSession(token: string): SafeUser | null {
    if (!token) return null;
    const sessions = loadSessions();
    const session = sessions[token];
    if (!session) return null;

    if (new Date(session.expires_at) < new Date()) {
      delete sessions[token];
      saveSessions(sessions);
      return null;
    }

    const user = this.findById(session.user_id);
    if (!user) return null;
    return toSafeUser(user);
  },

  revokeSession(token: string) {
    if (!token) return;
    const sessions = loadSessions();
    delete sessions[token];
    saveSessions(sessions);
  },

  getAuthUser(req: RequestLike): SafeUser | null {
    // 1. Check travel_session cookie (both parsed and raw cookie header)
    let cookieToken = req.cookies?.get?.("travel_session")?.value;
    if (!cookieToken) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(/travel_session=([^;]+)/);
        if (match) cookieToken = decodeURIComponent(match[1].trim());
      }
    }
    if (cookieToken) {
      const user = this.validateSession(cookieToken);
      if (user) return user;
    }

    // 2. Check Authorization Bearer header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.substring(7).trim();
      const user = this.validateSession(bearerToken);
      if (user) return user;
    }

    return null;
  },

  // Friends System
  listFriends(userId: string): SafeUser[] {
    const friends = loadFriends();
    const friendIds = friends
      .filter((f) => f.user_id === userId)
      .map((f) => f.friend_id);

    const users = loadUsers();
    return users.filter((u) => friendIds.includes(u.id)).map(toSafeUser);
  },

  addFriend(userId: string, friendCustomIdOrId: string): SafeUser {
    const friend = this.findByCustomId(friendCustomIdOrId) || this.findById(friendCustomIdOrId);
    if (!friend) throw new Error(`Traveler '@${friendCustomIdOrId}' was not found.`);
    if (friend.id === userId) throw new Error("You cannot add yourself as a friend.");

    const friends = loadFriends();
    const exists = friends.some((f) => f.user_id === userId && f.friend_id === friend.id);
    if (exists) throw new Error(`You are already friends with '@${friend.custom_id}'.`);

    // Mutual friendship
    const now = new Date().toISOString();
    friends.push({ user_id: userId, friend_id: friend.id, created_at: now });
    friends.push({ user_id: friend.id, friend_id: userId, created_at: now });
    saveFriends(friends);

    return toSafeUser(friend);
  },

  removeFriend(userId: string, friendId: string) {
    let friends = loadFriends();
    friends = friends.filter(
      (f) => !(f.user_id === userId && f.friend_id === friendId) &&
             !(f.user_id === friendId && f.friend_id === userId)
    );
    saveFriends(friends);
  },

  isFriend(userId: string, targetId: string): boolean {
    const friends = loadFriends();
    return friends.some((f) => f.user_id === userId && f.friend_id === targetId);
  },

  searchUsers(query: string, currentUserId?: string): UserSearchResult[] {
    const q = query.replace(/^@/, "").trim().toLowerCase();
    if (!q) return [];

    const users = loadUsers();
    const friends = loadFriends();
    const requests = loadRequests();

    const matches = users.filter((u) => {
      const matchCustom = u.custom_id.toLowerCase().includes(q);
      const matchName = u.display_name.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      return matchCustom || matchName || matchUser;
    });

    return matches.slice(0, 10).map((u) => {
      let status: "self" | "friends" | "pending_sent" | "pending_received" | "none" = "none";
      let activeRequestId: string | undefined;

      if (currentUserId && u.id === currentUserId) {
        status = "self";
      } else if (
        currentUserId &&
        friends.some((f) => f.user_id === currentUserId && f.friend_id === u.id)
      ) {
        status = "friends";
      } else if (currentUserId) {
        const outgoing = requests.find(
          (r) => r.sender_id === currentUserId && r.receiver_id === u.id && r.status === "pending"
        );
        if (outgoing) {
          status = "pending_sent";
          activeRequestId = outgoing.id;
        } else {
          const incoming = requests.find(
            (r) => r.sender_id === u.id && r.receiver_id === currentUserId && r.status === "pending"
          );
          if (incoming) {
            status = "pending_received";
            activeRequestId = incoming.id;
          }
        }
      }

      return {
        ...toSafeUser(u),
        friendship_status: status,
        active_request_id: activeRequestId,
      };
    });
  },

  sendFriendRequest(senderId: string, targetCustomIdOrId: string): { request: FriendRequestRecord; target: SafeUser } {
    const cleanTarget = targetCustomIdOrId.replace(/^@/, "").trim();
    const target = this.findByCustomId(cleanTarget) || this.findById(cleanTarget);
    if (!target) {
      throw new Error(`Traveler '@${cleanTarget}' was not found.`);
    }
    if (target.id === senderId) {
      throw new Error("You cannot send a friend request to yourself.");
    }
    if (this.isFriend(senderId, target.id)) {
      throw new Error(`You are already friends with '@${target.custom_id}'.`);
    }

    const requests = loadRequests();
    const existingOutgoing = requests.find(
      (r) => r.sender_id === senderId && r.receiver_id === target.id && r.status === "pending"
    );
    if (existingOutgoing) {
      throw new Error(`You already sent a friend request to '@${target.custom_id}'.`);
    }

    // Check if the other person already sent a request to this user -> auto accept!
    const existingIncoming = requests.find(
      (r) => r.sender_id === target.id && r.receiver_id === senderId && r.status === "pending"
    );
    if (existingIncoming) {
      existingIncoming.status = "accepted";
      existingIncoming.updated_at = new Date().toISOString();
      saveRequests(requests);
      this.addFriend(senderId, target.id);
      return { request: existingIncoming, target: toSafeUser(target) };
    }

    const now = new Date().toISOString();
    const newRequest: FriendRequestRecord = {
      id: "freq-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
      sender_id: senderId,
      receiver_id: target.id,
      status: "pending",
      created_at: now,
      updated_at: now,
    };

    requests.unshift(newRequest);
    saveRequests(requests);

    return { request: newRequest, target: toSafeUser(target) };
  },

  listFriendRequests(userId: string) {
    const requests = loadRequests();
    const users = loadUsers();
    const userMap = new Map(users.map((u) => [u.id, toSafeUser(u)]));

    const incoming = requests
      .filter((r) => r.receiver_id === userId && r.status === "pending")
      .map((r) => ({
        ...r,
        sender: userMap.get(r.sender_id) || {
          id: r.sender_id,
          custom_id: "traveler",
          username: "traveler",
          display_name: "Traveler",
          bio: "",
          avatar_url: "",
          created_at: r.created_at,
          updated_at: r.updated_at,
        },
      }));

    const outgoing = requests
      .filter((r) => r.sender_id === userId && r.status === "pending")
      .map((r) => ({
        ...r,
        receiver: userMap.get(r.receiver_id) || {
          id: r.receiver_id,
          custom_id: "traveler",
          username: "traveler",
          display_name: "Traveler",
          bio: "",
          avatar_url: "",
          created_at: r.created_at,
          updated_at: r.updated_at,
        },
      }));

    return { incoming, outgoing };
  },

  acceptFriendRequest(userId: string, requestId: string): { request: FriendRequestRecord; friend: SafeUser } {
    const requests = loadRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error("Friend request not found.");
    }
    if (req.receiver_id !== userId) {
      throw new Error("You are not authorized to accept this friend request.");
    }
    if (req.status !== "pending") {
      throw new Error(`This friend request has already been ${req.status}.`);
    }

    req.status = "accepted";
    req.updated_at = new Date().toISOString();
    saveRequests(requests);

    const friend = this.addFriend(userId, req.sender_id);
    return { request: req, friend };
  },

  declineFriendRequest(userId: string, requestId: string): { request: FriendRequestRecord } {
    const requests = loadRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error("Friend request not found.");
    }
    if (req.receiver_id !== userId) {
      throw new Error("You are not authorized to decline this friend request.");
    }
    if (req.status !== "pending") {
      throw new Error(`This friend request has already been ${req.status}.`);
    }

    req.status = "declined";
    req.updated_at = new Date().toISOString();
    saveRequests(requests);

    return { request: req };
  },

  cancelFriendRequest(userId: string, requestId: string): { request: FriendRequestRecord } {
    const requests = loadRequests();
    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error("Friend request not found.");
    }
    if (req.sender_id !== userId) {
      throw new Error("You are not authorized to cancel this friend request.");
    }
    if (req.status !== "pending") {
      throw new Error(`This friend request is no longer pending.`);
    }

    req.status = "cancelled";
    req.updated_at = new Date().toISOString();
    saveRequests(requests);

    return { request: req };
  },

  // Friend Link (TTL 3 days = 72 hours)
  createFriendInvite(inviterId: string, expireHours = 72, maxUses = 0) {
    const inviter = this.findById(inviterId);
    if (!inviter) throw new Error("Inviter account not found.");

    const code = crypto.randomBytes(16).toString("hex");
    const now = new Date();
    // Default 72 hours = exactly 3 days TTL
    const expiresAt = new Date(now.getTime() + expireHours * 3600 * 1000).toISOString();

    const inviteRecord: FriendInviteRecord = {
      id: "inv-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex"),
      code,
      inviter_id: inviterId,
      max_uses: maxUses,
      uses_count: 0,
      expires_at: expiresAt,
      created_at: now.toISOString(),
    };

    const invites = loadInvites();
    invites.unshift(inviteRecord);
    saveInvites(invites);

    return {
      ...inviteRecord,
      invite_url: `/invite/${code}`,
      inviter: toSafeUser(inviter),
    };
  },

  getFriendInvite(code: string, currentUserId?: string) {
    const invites = loadInvites();
    const invite = invites.find((i) => i.code === code);
    if (!invite) {
      throw new Error("Friend invite link not found.");
    }

    const inviter = this.findById(invite.inviter_id);
    const safeInviter = inviter ? toSafeUser(inviter) : null;

    const now = Date.now();
    const expiresTime = new Date(invite.expires_at).getTime();
    const isExpired = now > expiresTime;
    const isExhausted = invite.max_uses > 0 && invite.uses_count >= invite.max_uses;
    const isSelf = currentUserId === invite.inviter_id;
    const isFriend = currentUserId ? this.isFriend(currentUserId, invite.inviter_id) : false;
    const remainingMs = Math.max(0, expiresTime - now);
    const remainingHours = Math.round(remainingMs / (3600 * 1000));

    return {
      invite,
      inviter: safeInviter,
      is_expired: isExpired,
      is_exhausted: isExhausted,
      is_self: isSelf,
      is_friend: isFriend,
      expires_in_hours: remainingHours,
    };
  },

  acceptFriendInvite(receiverId: string, code: string) {
    const check = this.getFriendInvite(code, receiverId);
    if (check.is_expired) {
      throw new Error("This friend invite link has expired. Links expire after 3 days.");
    }
    if (check.is_exhausted) {
      throw new Error("This friend invite link has reached its maximum uses.");
    }
    if (check.is_self) {
      throw new Error("You cannot accept your own friend invite link.");
    }

    if (this.isFriend(receiverId, check.invite.inviter_id)) {
      return {
        friend: check.inviter,
        already_friends: true,
        message: `You are already friends with @${check.inviter?.custom_id}.`,
      };
    }

    // Connect as mutual friends
    const friend = this.addFriend(receiverId, check.invite.inviter_id);

    // Update uses count
    const invites = loadInvites();
    const inv = invites.find((i) => i.code === code);
    if (inv) {
      inv.uses_count += 1;
      saveInvites(invites);
    }

    return {
      friend,
      already_friends: false,
      message: `Connected with @${friend.custom_id} as friends!`,
    };
  },
};
