import { NextRequest, NextResponse } from "next/server";
import { userStore, generateRandomCustomId } from "@/lib/server/userStore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const isSimulated = searchParams.get("simulated") === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  let providerUserId = "";
  let displayName = "Microsoft Traveler";

  if (isSimulated || !process.env.MICROSOFT_CLIENT_ID || !code) {
    providerUserId = "ms_sub_" + Math.random().toString(36).substring(2, 9);
    displayName = "Microsoft Explorer";
  } else {
    try {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const redirectUri = `${appUrl}/api/v1/auth/oauth/microsoft/callback`;

      const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
        return NextResponse.redirect(`${appUrl}?error=microsoft_oauth_token_failed`);
      }

      const tokenData = await tokenRes.json();
      const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!meRes.ok) {
        return NextResponse.redirect(`${appUrl}?error=microsoft_oauth_userinfo_failed`);
      }

      const me = await meRes.json();
      providerUserId = me.id;
      displayName = me.displayName || "Microsoft Traveler";
    } catch {
      return NextResponse.redirect(`${appUrl}?error=microsoft_oauth_error`);
    }
  }

  // Lookup or create user with randomized @traveler_xxxx tag
  const existingUser = userStore.findByOAuth("microsoft", providerUserId);
  let userId: string;

  if (!existingUser) {
    let customId = generateRandomCustomId("wanderer");
    while (userStore.findByCustomId(customId)) {
      customId = generateRandomCustomId("wanderer");
    }

    const newUser = userStore.createUser({
      custom_id: customId,
      display_name: displayName,
      avatar_url: "", // Anonymous by default
      auth_provider: "microsoft",
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
