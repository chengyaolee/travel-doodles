import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/server/oauthConfig";

export async function GET(req: NextRequest) {
  const config = getOAuthConfig();
  const appUrl = config.appUrl || req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/v1/auth/oauth/google/callback`;

  if (!config.googleClientId) {
    // Real OAuth: credentials must be provided in backend .env
    return NextResponse.redirect(`${appUrl}?auth_error=google_oauth_not_configured`);
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    config.googleClientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20profile%20email&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
