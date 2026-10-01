// Encrypted-at-rest storage for OAuth tokens.
//
// The access token and refresh token are AES-256-GCM encrypted via
// src/lib/crypto.ts before they ever hit the database. Callers only ever
// handle plaintext.

import { decrypt, encrypt } from "./crypto";
import { sql } from "./db";
import { DEV_HOUSEHOLD_ID, DEV_VIEWER } from "./dev";

export interface TokenRecord {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date;
  scope: string;
  accountEmail: string | null;
}

interface TokenRow {
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  access_token_expires_at: Date;
  scope: string;
  account_email: string | null;
}

export async function getTokens(
  options: { householdId?: string; memberId?: string; provider?: "google" } = {},
): Promise<TokenRecord | null> {
  const householdId = options.householdId ?? DEV_HOUSEHOLD_ID;
  const memberId = options.memberId ?? DEV_VIEWER.memberId;
  const provider = options.provider ?? "google";

  const rows = await sql<TokenRow[]>`
    select access_token_encrypted,
           refresh_token_encrypted,
           access_token_expires_at,
           scope,
           account_email
    from oauth_tokens
    where household_id = ${householdId}
      and member_id = ${memberId}
      and provider = ${provider}
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    accessToken: decrypt(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted
      ? decrypt(row.refresh_token_encrypted)
      : null,
    accessTokenExpiresAt: row.access_token_expires_at,
    scope: row.scope,
    accountEmail: row.account_email,
  };
}

export async function saveTokens(
  input: {
    accessToken: string;
    refreshToken: string | null;
    accessTokenExpiresAt: Date;
    scope: string;
    accountEmail?: string | null;
    householdId?: string;
    memberId?: string;
    provider?: "google";
  },
): Promise<void> {
  const householdId = input.householdId ?? DEV_HOUSEHOLD_ID;
  const memberId = input.memberId ?? DEV_VIEWER.memberId;
  const provider = input.provider ?? "google";

  const accessEnc = encrypt(input.accessToken);
  const refreshEnc = input.refreshToken ? encrypt(input.refreshToken) : null;

  await sql`
    insert into oauth_tokens (
      household_id, member_id, provider,
      access_token_encrypted, refresh_token_encrypted,
      access_token_expires_at, scope, account_email
    ) values (
      ${householdId}, ${memberId}, ${provider},
      ${accessEnc}, ${refreshEnc},
      ${input.accessTokenExpiresAt}, ${input.scope},
      ${input.accountEmail ?? null}
    )
    on conflict (household_id, member_id, provider) do update set
      access_token_encrypted  = excluded.access_token_encrypted,
      refresh_token_encrypted = coalesce(
        excluded.refresh_token_encrypted,
        oauth_tokens.refresh_token_encrypted
      ),
      access_token_expires_at = excluded.access_token_expires_at,
      scope                   = excluded.scope,
      account_email           = coalesce(excluded.account_email, oauth_tokens.account_email)
  `;
}

export async function deleteTokens(
  options: { householdId?: string; memberId?: string; provider?: "google" } = {},
): Promise<void> {
  const householdId = options.householdId ?? DEV_HOUSEHOLD_ID;
  const memberId = options.memberId ?? DEV_VIEWER.memberId;
  const provider = options.provider ?? "google";

  await sql`
    delete from oauth_tokens
    where household_id = ${householdId}
      and member_id = ${memberId}
      and provider = ${provider}
  `;
}
