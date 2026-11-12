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

function resolveDataDir(): string {
  const cwd = process.cwd();
  const directPath = path.join(cwd, ".data");
  const nestedPath = path.join(cwd, "frontend", ".data");

  if (fs.existsSync(nestedPath)) return nestedPath;
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

let cachedUsers: UserRecord[] | null = null;
let cachedSessions: Record<string, SessionRecord> | null = null;
let cachedFriends: FriendRelation[] | null = null;

function loadUsers(): UserRecord[] {
  if (cachedUsers) return cachedUsers;
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      cachedUsers = JSON.parse(data);
      return cachedUsers!;
    } catch {
      // ignore
    }
  }
  cachedUsers = [];
  return cachedUsers;
}

function saveUsers(users: UserRecord[]) {
  cachedUsers = users;
  const tmpFile = `${USERS_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(users, null, 2), "utf-8");
    fs.renameSync(tmpFile, USERS_FILE);
  } catch {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    } catch {
      // ignore
    }
  }
}

function loadSessions(): Record<string, SessionRecord> {
  if (cachedSessions) return cachedSessions;
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const data = fs.readFileSync(SESSIONS_FILE, "utf-8");
      cachedSessions = JSON.parse(data);
      return cachedSessions!;
    } catch {
      // ignore
    }
  }
  cachedSessions = {};
  return cachedSessions;
}

function saveSessions(sessions: Record<string, SessionRecord>) {
  cachedSessions = sessions;
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

function loadFriends(): FriendRelation[] {
  if (cachedFriends) return cachedFriends;
  if (fs.existsSync(FRIENDS_FILE)) {
    try {
      const data = fs.readFileSync(FRIENDS_FILE, "utf-8");
      cachedFriends = JSON.parse(data);
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

  createSession(userId: string): string {
    const sessions = loadSessions();
    const token = "sess_" + crypto.randomBytes(32).toString("hex");
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
    // 1. Check travel_session cookie
    const cookieToken = req.cookies.get("travel_session")?.value;
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
};
