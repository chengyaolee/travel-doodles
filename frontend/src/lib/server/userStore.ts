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
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
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

let cachedUsers: UserRecord[] | null = null;
let cachedSessions: Record<string, SessionRecord> | null = null;

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
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // ignore
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

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + ":travel_salt_2026").digest("hex");
}

export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    custom_id: user.custom_id,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url,
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

  createUser(params: {
    custom_id: string;
    display_name?: string;
    bio?: string;
    password?: string;
    avatar_url?: string;
  }): SafeUser {
    const users = loadUsers();
    const cleanCustomId = params.custom_id.trim();

    if (this.findByCustomId(cleanCustomId)) {
      throw new Error(`The custom ID '${cleanCustomId}' is already taken.`);
    }

    const defaultAvatars = [
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&h=160&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&h=160&fit=crop&crop=face",
    ];
    const randomAvatar = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];

    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: "usr_" + crypto.randomUUID(),
      custom_id: cleanCustomId,
      username: cleanCustomId,
      display_name: params.display_name?.trim() || cleanCustomId,
      bio: params.bio?.trim() || "Wandering the world one doodle at a time.",
      avatar_url: params.avatar_url || randomAvatar,
      password_hash: params.password ? hashPassword(params.password) : undefined,
      created_at: now,
      updated_at: now,
    };

    users.push(newUser);
    saveUsers(users);
    return toSafeUser(newUser);
  },

  verifyCredentials(customId: string, password?: string): SafeUser | null {
    const user = this.findByCustomId(customId);
    if (!user) return null;

    if (user.password_hash) {
      if (!password) return null;
      if (user.password_hash !== hashPassword(password)) return null;
    }
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
};
