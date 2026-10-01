import { NextResponse, type NextRequest } from "next/server";

import { saveTokens } from "@/lib/gmail-tokens";
import {
  exchangeCodeForTokens,
  fetchGoogleEmail,
  readOAuthEnv,
} from "@/lib/gmail/oauth";

export const dynamic = "force-dynamic";

// GET /api/gmail/oauth/callback?code=…&state=…
//
// Google redirects the browser here after consent. We:
//   1. Verify the state matches the cookie set by /start (CSRF).
//   2. Exchange the authorization code for access + refresh tokens.
//   3. Encrypt and persist them.
//   4. Clear the state cookie and send the user back to /inbox.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const stateCookie = req.cookies.get("gmail_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(
      new URL(`/inbox?gmail=${encodeURIComponent(error)}`, url.origin),
    );
  }
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(
      new URL("/inbox?gmail=state_mismatch", url.origin),
    );
  }

  try {
    const env = readOAuthEnv();
    const tokens = await exchangeCodeForTokens(env, code);

    // `expires_in` is seconds from now.
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const email = await fetchGoogleEmail(tokens.access_token).catch(() => null);

    await saveTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      accessTokenExpiresAt: expiresAt,
      scope: tokens.scope,
      accountEmail: email,
    });

    const res = NextResponse.redirect(new URL("/inbox?gmail=connected", url.origin));
    res.cookies.set("gmail_oauth_state", "", {
      path: "/api/gmail/oauth",
      maxAge: 0,
    });
    return res;
  } catch (e) {
    console.error("Gmail OAuth callback failed", e);
    return NextResponse.redirect(
      new URL("/inbox?gmail=exchange_failed", url.origin),
    );
  }
}
