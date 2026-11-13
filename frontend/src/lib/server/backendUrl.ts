import { NextRequest } from "next/server";
import { userStore, SafeUser, toSafeUser } from "./userStore";
import { loadBackendEnv } from "./oauthConfig";

/**
 * Returns the resolved live Go backend URL if active, ensuring
 * environment variables are properly loaded from candidate .env files.
 */
export function getBackendUrl(): string {
  loadBackendEnv();
  let url = (process.env.BACKEND_URL || process.env.GO_BACKEND_URL || "").trim();
  if (!url) return "";
  // If protocol was omitted (e.g. "123.45.67.89:8080"), prepend http://
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  // Strip trailing slashes
  return url.replace(/\/+$/, "");
}

/**
 * Resolves authenticated user across both local userStore and live Go backend.
 * Checks travel_session cookie and Authorization Bearer header.
 * When a live Go backend is configured, the backend is the source of truth (no fallback).
 */
export async function resolveAuthUser(req: NextRequest): Promise<SafeUser | null> {
  const backendUrl = getBackendUrl();
  const cookieHeader = req.headers.get("cookie") || "";
  const authHeader = req.headers.get("authorization") || "";

  // 1. If live Go backend is configured, backend is the source of truth
  if (backendUrl) {
    if (!cookieHeader && !authHeader) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${backendUrl}/api/v1/auth/me`, {
        headers: {
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const goUser = data.user || data;
        if (goUser && (goUser.id || goUser.custom_id)) {
          // Synchronize user and session to local store so subsequent operations have user context
          let token =
            req.cookies?.get?.("travel_session")?.value ||
            (authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "");
          if (!token && cookieHeader) {
            const match = cookieHeader.match(/travel_session=([^;]+)/);
            if (match) token = decodeURIComponent(match[1].trim());
          }

          let user = userStore.findById(goUser.id) || userStore.findByCustomId(goUser.custom_id || goUser.username);
          if (!user) {
            try {
              user = userStore.createUser({
                custom_id: goUser.custom_id || goUser.username || "traveler",
                display_name: goUser.display_name || goUser.name,
                avatar_url: goUser.avatar_url || goUser.avatar,
                bio: goUser.bio,
              });
            } catch {
              user = userStore.findByCustomId(goUser.custom_id || goUser.username || "");
            }
          }
          if (token && user) {
            userStore.createSession(user.id, token);
          }
          return user ? toSafeUser(user) : {
            id: goUser.id,
            custom_id: goUser.custom_id || goUser.username || "traveler",
            username: goUser.username || goUser.custom_id || "traveler",
            display_name: goUser.display_name || goUser.name || "Traveler",
            bio: goUser.bio || "",
            avatar_url: goUser.avatar_url || goUser.avatar || "",
            created_at: goUser.created_at || new Date().toISOString(),
            updated_at: goUser.updated_at || new Date().toISOString(),
          };
        }
      }
      return null;
    } catch (err) {
      console.error("Failed to authenticate with live Go backend:", err);
      return null;
    }
  }

  // 2. Pure local mode (no live Go backend configured)
  return userStore.getAuthUser(req);
}
