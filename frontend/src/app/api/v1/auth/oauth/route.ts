import { NextRequest, NextResponse } from "next/server";
import { userStore, generateRandomCustomId, toSafeUser, SafeUser } from "@/lib/server/userStore";

const BACKEND_URL = process.env.BACKEND_URL || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = (body.provider || "google").toLowerCase().trim();
    const providerUserId = (body.provider_user_id || body.id || "").trim();
    const email = (body.email || "").trim();
    const displayName = (body.display_name || body.name || "").trim() || "Traveler";
    const avatarUrl = (body.avatar_url || body.picture || "").trim();

    if (!providerUserId) {
      return NextResponse.json(
        { error: "Provider user ID is required." },
        { status: 400 }
      );
    }

    // Proxy to live Go backend if active (with 4s timeout)
    if (BACKEND_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const goRes = await fetch(`${BACKEND_URL}/api/v1/auth/oauth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            provider_user_id: providerUserId,
            display_name: displayName,
            email,
            avatar_url: avatarUrl,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (goRes.ok) {
          const data = await goRes.json();
          const cookieHeader = goRes.headers.get("set-cookie");
          const response = NextResponse.json(data);
          if (cookieHeader) response.headers.set("set-cookie", cookieHeader);
          return response;
        }
      } catch {
        // Fallback
      }
    }

    // Look up or create in userStore
    const existingUser = userStore.findByOAuth(provider, providerUserId);
    let safeUser: SafeUser;

    if (!existingUser) {
      // The @ id is randomised first, then can be changed in profile settings
      let customId = generateRandomCustomId(provider === "google" ? "traveler" : "explorer");
      while (userStore.findByCustomId(customId)) {
        customId = generateRandomCustomId("traveler");
      }

      safeUser = userStore.createUser({
        custom_id: customId,
        display_name: displayName,
        avatar_url: avatarUrl, // from OAuth profile if available, else anonymous
        auth_provider: provider,
        auth_provider_id: providerUserId,
      });
    } else {
      safeUser = toSafeUser(existingUser);
    }

    const sessionToken = userStore.createSession(safeUser.id);
    const response = NextResponse.json({
      user: safeUser,
      token: sessionToken,
      message: `Signed in via ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
    });

    response.cookies.set("travel_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "OAuth authentication failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
