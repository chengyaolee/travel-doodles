import { NextRequest, NextResponse } from "next/server";
import { userStore, generateRandomCustomId } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (errorParam) {
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_${encodeURIComponent(errorParam)}`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_oauth_not_configured`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_missing_authorization_code`);
  }

  try {
    const redirectUri = `${appUrl}/api/v1/auth/oauth/microsoft/callback`;

    // 1. Exchange authorization code for Microsoft access token
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
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
      console.error("Microsoft token exchange error:", tokenRes.status, errText);
      return NextResponse.redirect(`${appUrl}?auth_error=microsoft_token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();

    // 2. Fetch authenticated profile from Microsoft Graph API
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!meRes.ok) {
      return NextResponse.redirect(`${appUrl}?auth_error=microsoft_userinfo_failed`);
    }

    const me = await meRes.json();
    const providerUserId = me.id;
    const displayName = me.displayName || "Microsoft Traveler";
    const email = me.mail || me.userPrincipalName || "";

    if (!providerUserId) {
      return NextResponse.redirect(`${appUrl}?auth_error=microsoft_invalid_profile`);
    }

    // 3. Proxy to live Go backend if configured
    if (BACKEND_URL) {
      try {
        const goRes = await fetch(`${BACKEND_URL}/api/v1/auth/oauth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "microsoft",
            provider_user_id: providerUserId,
            display_name: displayName,
            email,
            avatar_url: "",
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
        console.error("Failed to forward Microsoft OAuth to live Go backend:", err);
      }
    }

    // 4. Fallback to local server store
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
        avatar_url: "",
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
  } catch (error: unknown) {
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_oauth_server_error`);
  }
}
