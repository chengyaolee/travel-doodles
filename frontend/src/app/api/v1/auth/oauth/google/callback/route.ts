import { NextRequest, NextResponse } from "next/server";
import { userStore, generateRandomCustomId } from "@/lib/server/userStore";
import { getOAuthConfig } from "@/lib/server/oauthConfig";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const config = getOAuthConfig();
  const appUrl = config.appUrl || req.nextUrl.origin;

  if (errorParam) {
    return NextResponse.redirect(`${appUrl}?auth_error=google_${encodeURIComponent(errorParam)}`);
  }

  if (!config.googleClientId || !config.googleClientSecret) {
    return NextResponse.redirect(`${appUrl}?auth_error=google_oauth_not_configured`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}?auth_error=google_missing_authorization_code`);
  }

  try {
    const redirectUri = `${appUrl}/api/v1/auth/oauth/google/callback`;

    // 1. Exchange authorization code for Google access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      console.error("Google token exchange error:", tokenRes.status, errText);
      return NextResponse.redirect(`${appUrl}?auth_error=google_token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();

    // 2. Fetch authenticated profile from Google userinfo API
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userinfoRes.ok) {
      return NextResponse.redirect(`${appUrl}?auth_error=google_userinfo_failed`);
    }

    const userinfo = await userinfoRes.json();
    const providerUserId = userinfo.sub;
    const displayName = userinfo.name || userinfo.given_name || "Google Traveler";
    const avatarUrl = userinfo.picture || "";
    const email = userinfo.email || "";

    if (!providerUserId) {
      return NextResponse.redirect(`${appUrl}?auth_error=google_invalid_profile`);
    }

    // 3. Forward to live Go backend if configured (fast 1.5s timeout)
    if (config.backendUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const goRes = await fetch(`${config.backendUrl}/api/v1/auth/oauth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "google",
            provider_user_id: providerUserId,
            display_name: displayName,
            email,
            avatar_url: avatarUrl,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (goRes.ok) {
          const cookieHeader = goRes.headers.get("set-cookie");
          // Synchronize to userStore as well
          const existingUser = userStore.findByOAuth("google", providerUserId);
          let localUserId: string;
          if (!existingUser) {
            let customId = generateRandomCustomId("traveler");
            while (userStore.findByCustomId(customId)) {
              customId = generateRandomCustomId("traveler");
            }
            const newUser = userStore.createUser({
              custom_id: customId,
              display_name: displayName,
              avatar_url: avatarUrl,
              auth_provider: "google",
              auth_provider_id: providerUserId,
            });
            localUserId = newUser.id;
          } else {
            localUserId = existingUser.id;
          }

          // Extract token from cookie header if possible
          let extractedToken = "";
          if (cookieHeader) {
            const match = cookieHeader.match(/travel_session=([^;]+)/);
            if (match) extractedToken = match[1];
          }
          const sessionToken = userStore.createSession(localUserId, extractedToken || undefined);

          const response = NextResponse.redirect(`${appUrl}/?auth_status=authenticating`);
          if (cookieHeader) {
            response.headers.set("set-cookie", cookieHeader);
          } else {
            response.cookies.set("travel_session", sessionToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 7 * 24 * 60 * 60,
              path: "/",
            });
          }
          return response;
        } else {
          const errBody = await goRes.text().catch(() => "");
          console.error("Backend OAuth login failed with status", goRes.status, errBody);
          return NextResponse.redirect(`${appUrl}?auth_error=backend_oauth_failed`);
        }
      } catch (err) {
        console.error("Failed to forward Google OAuth to live Go backend (timed out or unreachable):", err);
        return NextResponse.redirect(`${appUrl}?auth_error=backend_unavailable`);
      }
    }

    // 4. Server user store synchronization
    const existingUser = userStore.findByOAuth("google", providerUserId);
    let userId: string;

    if (!existingUser) {
      let customId = generateRandomCustomId("traveler");
      while (userStore.findByCustomId(customId)) {
        customId = generateRandomCustomId("traveler");
      }

      const newUser = userStore.createUser({
        custom_id: customId,
        display_name: displayName,
        avatar_url: avatarUrl,
        auth_provider: "google",
        auth_provider_id: providerUserId,
      });
      userId = newUser.id;
    } else {
      userId = existingUser.id;
    }

    const sessionToken = userStore.createSession(userId);
    const response = NextResponse.redirect(`${appUrl}/?auth_status=authenticating`);
    response.cookies.set("travel_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}?auth_error=google_oauth_server_error`);
  }
}
