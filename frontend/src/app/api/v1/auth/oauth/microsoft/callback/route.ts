import { NextRequest, NextResponse } from "next/server";
import { userStore, generateRandomCustomId } from "@/lib/server/userStore";
import { getOAuthConfig } from "@/lib/server/oauthConfig";
import { getBackendUrl } from "@/lib/server/backendUrl";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const config = getOAuthConfig();
  const appUrl = config.appUrl || req.nextUrl.origin;

  if (errorParam) {
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_${encodeURIComponent(errorParam)}`);
  }

  if (!config.microsoftClientId || !config.microsoftClientSecret) {
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_oauth_not_configured`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_missing_authorization_code`);
  }

  try {
    const redirectUri = `${appUrl}/api/v1/auth/oauth/microsoft/callback`;

    const tenant = config.microsoftTenantId || "common";
    // 1. Exchange authorization code for Microsoft access token
    const tokenRes = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.microsoftClientId,
        client_secret: config.microsoftClientSecret,
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

    // 3. Forward to live Go backend if configured
    const backendUrl = getBackendUrl();
    if (backendUrl) {
      let goRes: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        goRes = await fetch(`${backendUrl}/api/v1/auth/oauth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": process.env.OAUTH_INTERNAL_SECRET || "",
          },
          body: JSON.stringify({
            provider: "microsoft",
            provider_user_id: providerUserId,
            display_name: displayName,
            email,
            avatar_url: "",
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (err) {
        console.error("Failed to forward Microsoft OAuth to live Go backend:", backendUrl, err);
        // Surface the network cause (ENOTFOUND, ECONNREFUSED, AbortError, ...) so it is diagnosable from the UI
        const e = err as { name?: string; cause?: { code?: string } };
        const reason = e.cause?.code || e.name || "error";
        return NextResponse.redirect(`${appUrl}?auth_error=backend_unavailable_${encodeURIComponent(reason)}`);
      }

      const cookieHeader = goRes.headers.get("set-cookie");
      if (!goRes.ok || !cookieHeader) {
        const errBody = await goRes.text().catch(() => "");
        console.error("Backend Microsoft OAuth login failed with status", goRes.status, errBody);
        return NextResponse.redirect(`${appUrl}?auth_error=backend_oauth_failed_${goRes.status}`);
      }

      // Backend is the source of truth for users/sessions; just hand its session cookie to the browser
      const response = NextResponse.redirect(`${appUrl}/?auth_status=authenticating`);
      response.headers.set("set-cookie", cookieHeader);
      return response;
    }

    // 4. Server user store synchronization
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
    console.error("Microsoft OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_oauth_server_error`);
  }
}
