import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig } from "@/lib/server/oauthConfig";

export async function GET(req: NextRequest) {
  const config = getOAuthConfig();
  const appUrl = config.appUrl || req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/v1/auth/oauth/microsoft/callback`;

  if (!config.microsoftClientId) {
    // Real OAuth: credentials must be provided in backend .env
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_oauth_not_configured`);
  }

  const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
    config.microsoftClientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20profile%20email%20User.Read&prompt=select_account`;

  return NextResponse.redirect(msAuthUrl);
}
