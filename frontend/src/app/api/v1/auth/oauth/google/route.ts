import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isSimulated = searchParams.get("simulated") === "true";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/v1/auth/oauth/google/callback`;

  if (isSimulated || !clientId) {
    // If keys not set or simulated requested, forward to callback with simulation flag
    return NextResponse.redirect(`${redirectUri}?simulated=true`);
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20profile%20email&prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
