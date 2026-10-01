import { NextResponse } from "next/server";

import {
  buildAuthorizationUrl,
  newState,
  readOAuthEnv,
} from "@/lib/gmail/oauth";

export const dynamic = "force-dynamic";

// GET /api/gmail/oauth/start → redirects to Google's consent screen.
// The one-time state nonce is set as an httpOnly cookie that the callback
// verifies, defending against CSRF on the OAuth redirect.
export function GET(): NextResponse {
  const env = readOAuthEnv();
  const state = newState();

  const url = buildAuthorizationUrl(env, state);
  const res = NextResponse.redirect(url);
  res.cookies.set("gmail_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/gmail/oauth",
    maxAge: 10 * 60,
  });
  return res;
}
