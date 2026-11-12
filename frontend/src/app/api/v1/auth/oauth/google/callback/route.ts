import { NextRequest, NextResponse } from "next/server";
import { userStore, generateRandomCustomId } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (errorParam) {
    return NextResponse.redirect(`${appUrl}?auth_error=google_${encodeURIComponent(errorParam)}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
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
        client_id: clientId,
        client_secret: clientSecret,
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

    // 3. Proxy to live Go backend if configured
    if (BACKEND_URL) {
      try {
        const goRes = await fetch(`${BACKEND_URL}/api/v1/auth/oauth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "google",
            provider_user_id: providerUserId,
            display_name: displayName,
            email,
            avatar_url: avatarUrl,
          }),
        });

        if (goRes.ok) {
          const cookieHeader = goRes.headers.get("set-cookie");
          const response = NextResponse.redirect(`${appUrl}/`);
          if (cookieHeader) {
            response.headers.set("set-cookie", cookieHeader);
          }
          return response;
        }
      } catch (err) {
        console.error("Failed to forward Google OAuth to live Go backend:", err);
      }
    }

    // 4. Fallback to local server store
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
    const response = NextResponse.redirect(`${appUrl}/`);
    response.cookies.set("travel_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}?auth_error=google_oauth_server_error`);
  }
}
