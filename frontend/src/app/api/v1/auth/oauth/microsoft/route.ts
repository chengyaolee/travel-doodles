import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/v1/auth/oauth/microsoft/callback`;

  if (!clientId) {
    // Never simulate or silently generate fake accounts!
    return NextResponse.redirect(`${appUrl}?auth_error=microsoft_oauth_not_configured`);
  }

  const msAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20profile%20email%20User.Read&prompt=select_account`;

  return NextResponse.redirect(msAuthUrl);
}
