import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/v1/auth/oauth/google/callback`;

  if (!clientId) {
    // If Google OAuth credentials are not configured, redirect back to home with an explicit error code.
    // Never simulate or silently generate fake accounts without authentication!
    return NextResponse.redirect(`${appUrl}?auth_error=google_oauth_not_configured`);
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20profile%20email&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
