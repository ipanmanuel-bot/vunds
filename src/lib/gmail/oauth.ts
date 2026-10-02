// Google OAuth 2.0 — authorization code flow with offline access.
//
// Scope: `gmail.readonly` only. The least-privilege scope needed to list and
// read messages. We do NOT request send / modify / labels / settings.
//
// All code paths run server-side. Access and refresh tokens never cross the
// client/server boundary — the UI only ever sees a "connected / not
// connected" indicator.

import { randomBytes } from "node:crypto";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface OAuthEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function readOAuthEnv(): OAuthEnv {
  const clientId = process.env.AUTH_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.AUTH_GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.AUTH_GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth is not configured. Set AUTH_GOOGLE_CLIENT_ID, " +
        "AUTH_GOOGLE_CLIENT_SECRET, AUTH_GOOGLE_REDIRECT_URI in .env.local " +
        "(see README).",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

// Build the Google authorization URL. `access_type=offline` + `prompt=consent`
// ensures we get a refresh token on consent. `prompt=select_account` forces
// Google to show the account picker — important when the user already has
// one Gmail connected and wants to add a second one from a different inbox.
// `state` is a one-time CSRF nonce (the callback verifies it against the
// httpOnly cookie we set).
export function buildAuthorizationUrl(env: OAuthEnv, state: string): string {
  const params = new URLSearchParams({
    client_id: env.clientId,
    redirect_uri: env.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    prompt: "select_account consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export function newState(): string {
  return randomBytes(16).toString("hex");
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(
  env: OAuthEnv,
  code: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: env.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`OAuth code exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(
  env: OAuthEnv,
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: env.clientId,
    client_secret: env.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`OAuth refresh failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

// Fetch the connected Gmail's primary email address.
//
// Uses the Gmail API's own `users.getProfile` endpoint rather than
// /oauth2/v2/userinfo — the userinfo endpoint requires the `email` or
// `openid` scope, which we deliberately don't request. getProfile only
// needs `gmail.readonly`, which we already have.
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { emailAddress?: string };
  return data.emailAddress ?? null;
}
