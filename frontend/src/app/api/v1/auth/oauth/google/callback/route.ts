import { NextRequest, NextResponse } from "next/server";
import { userStore, generateRandomCustomId } from "@/lib/server/userStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const isSimulated = searchParams.get("simulated") === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  let providerUserId = "";
  let displayName = "Google Traveler";
  let avatarUrl = "";

  if (isSimulated || !process.env.GOOGLE_CLIENT_ID || !code) {
    // Simulated Google OAuth login for developer testing
    providerUserId = "google_sub_" + Math.random().toString(36).substring(2, 9);
    displayName = "Google Explorer";
  } else {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = `${appUrl}/api/v1/auth/oauth/google/callback`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        return NextResponse.redirect(`${appUrl}?error=google_oauth_token_failed`);
      }

      const tokenData = await tokenRes.json();
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userinfoRes.ok) {
        return NextResponse.redirect(`${appUrl}?error=google_oauth_userinfo_failed`);
      }

      const userinfo = await userinfoRes.json();
      providerUserId = userinfo.sub;
      displayName = userinfo.name || userinfo.given_name || "Google Traveler";
      avatarUrl = userinfo.picture || "";
    } catch {
      return NextResponse.redirect(`${appUrl}?error=google_oauth_error`);
    }
  }

  // Lookup or create user with randomized @traveler_xxxx tag
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
}
