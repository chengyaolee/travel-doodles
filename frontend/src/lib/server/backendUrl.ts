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
 */
export async function resolveAuthUser(req: NextRequest): Promise<SafeUser | null> {
  // 1. First check local userStore (0ms)
  const localUser = userStore.getAuthUser(req);
  if (localUser) return localUser;

  // 2. Check live Go backend if configured and active
  const backendUrl = getBackendUrl();
  const cookieHeader = req.headers.get("cookie") || "";
  const authHeader = req.headers.get("authorization") || "";

  if (backendUrl && (cookieHeader || authHeader)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
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
          // Synchronize user and session to local store so subsequent operations are fast
          const token =
            req.cookies.get("travel_session")?.value ||
            (authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "");

          let user = userStore.findById(goUser.id) || userStore.findByCustomId(goUser.custom_id || goUser.username);
          if (!user) {
            user = userStore.createUser({
              custom_id: goUser.custom_id || goUser.username || "traveler",
              display_name: goUser.display_name || goUser.name,
              avatar_url: goUser.avatar_url || goUser.avatar,
              bio: goUser.bio,
            });
          }
          if (token) {
            userStore.createSession(user.id, token);
          }
          return toSafeUser(user);
        }
      }
    } catch {
      // Backend unreachable or timed out
    }
  }

  return null;
}
