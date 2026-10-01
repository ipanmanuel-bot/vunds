// Thin Gmail REST wrapper.
//
// We call Gmail directly over fetch so we don't pull in the official
// `googleapis` package (large, mostly unused). This covers only the two
// endpoints we need: list and get.
//
// Transparent token refresh: if a call returns 401, the client retries once
// after refreshing the access token.

import { saveTokens } from "../gmail-tokens";
import { refreshAccessToken, readOAuthEnv } from "./oauth";
import type { TokenRecord } from "../gmail-tokens";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
}

export interface GmailMessageResource {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPayload;
}

export interface GmailPayload {
  headers?: Array<{ name: string; value: string }>;
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPayload[];
}

export class GmailClient {
  private accessToken: string;
  private readonly refreshToken: string | null;
  private readonly tokens: TokenRecord;

  constructor(tokens: TokenRecord) {
    this.tokens = tokens;
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  async listMessages(query: string, max = 25): Promise<string[]> {
    const url = new URL(`${BASE}/messages`);
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(max));
    const data = await this.fetchJson<GmailListResponse>(url.toString());
    return (data.messages ?? []).map((m) => m.id);
  }

  async getMessage(id: string): Promise<GmailMessageResource> {
    const url = new URL(`${BASE}/messages/${id}`);
    url.searchParams.set("format", "full");
    return this.fetchJson<GmailMessageResource>(url.toString());
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const call = (token: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    let res = await call(this.accessToken);
    if (res.status === 401 && this.refreshToken) {
      await this.refresh();
      res = await call(this.accessToken);
    }
    if (!res.ok) {
      throw new Error(`Gmail API ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  private async refresh(): Promise<void> {
    if (!this.refreshToken) throw new Error("No refresh token available");
    const env = readOAuthEnv();
    const refreshed = await refreshAccessToken(env, this.refreshToken);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    this.accessToken = refreshed.access_token;
    // Persist the new access token so subsequent requests pick it up without
    // another round-trip to Google.
    await saveTokens({
      accessToken: refreshed.access_token,
      // Google often omits refresh_token on refresh; keep the existing one.
      refreshToken: refreshed.refresh_token ?? this.refreshToken,
      accessTokenExpiresAt: expiresAt,
      scope: refreshed.scope ?? this.tokens.scope,
      accountEmail: this.tokens.accountEmail,
    });
  }
}

// =========================================================================
// Payload helpers — flatten Gmail's part tree and decode base64url bodies.
// =========================================================================

function decodeBase64Url(s: string): string {
  const buf = Buffer.from(s, "base64url");
  return buf.toString("utf8");
}

function headerValue(
  payload: GmailPayload | undefined,
  name: string,
): string | undefined {
  if (!payload?.headers) return undefined;
  const match = payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return match?.value;
}

function partsOf(payload: GmailPayload | undefined): GmailPayload[] {
  if (!payload) return [];
  if (!payload.parts || payload.parts.length === 0) return [payload];
  const out: GmailPayload[] = [];
  for (const p of payload.parts) out.push(...partsOf(p));
  return out;
}

export interface FlattenedMessage {
  id: string;
  threadId?: string;
  internalDate?: string;
  from: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

export function flattenMessage(resource: GmailMessageResource): FlattenedMessage {
  const parts = partsOf(resource.payload);
  const text = parts.find((p) => p.mimeType === "text/plain")?.body?.data;
  const html = parts.find((p) => p.mimeType === "text/html")?.body?.data;
  return {
    id: resource.id,
    threadId: resource.threadId,
    internalDate: resource.internalDate,
    from: headerValue(resource.payload, "From") ?? "",
    subject: headerValue(resource.payload, "Subject") ?? "",
    bodyText: text ? decodeBase64Url(text) : "",
    bodyHtml: html ? decodeBase64Url(html) : undefined,
  };
}
