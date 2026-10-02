// Encrypted-at-rest storage for OAuth tokens.
//
// Each household can connect multiple Google accounts (one per Gmail
// mailbox they want imported). Uniqueness is enforced per
// (household_id, provider, account_email) at the DB level.
//
// The access token and refresh token are AES-256-GCM encrypted via
// src/lib/crypto.ts before they ever hit the database. Callers only ever
// handle plaintext.

import { decrypt, encrypt } from "./crypto";
import { sql } from "./db";
import { DEV_HOUSEHOLD_ID, DEV_VIEWER } from "./dev";

export interface TokenRecord {
  id: string;
  memberId: string;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date;
  scope: string;
  accountEmail: string;
}

interface TokenRow {
  id: string;
  member_id: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  access_token_expires_at: Date;
  scope: string;
  account_email: string;
}

function toRecord(row: TokenRow): TokenRecord {
  return {
    id: row.id,
    memberId: row.member_id,
    accessToken: decrypt(row.access_token_encrypted),
    refreshToken: row.refresh_token_encrypted
      ? decrypt(row.refresh_token_encrypted)
      : null,
    accessTokenExpiresAt: row.access_token_expires_at,
    scope: row.scope,
    accountEmail: row.account_email,
  };
}

// =========================================================================
// List all connected Google accounts for this household.
// =========================================================================
export async function listTokens(
  options: { householdId?: string; provider?: "google" } = {},
): Promise<TokenRecord[]> {
  const householdId = options.householdId ?? DEV_HOUSEHOLD_ID;
  const provider = options.provider ?? "google";

  const rows = await sql<TokenRow[]>`
    select id, member_id,
           access_token_encrypted, refresh_token_encrypted,
           access_token_expires_at, scope, account_email
    from oauth_tokens
    where household_id = ${householdId}
      and provider = ${provider}
    order by account_email
  `;
  return rows.map(toRecord);
}

// Return the token for a specific account email (used by sync workers that
// want to fetch messages from one mailbox at a time).
export async function getTokenByEmail(
  accountEmail: string,
  options: { householdId?: string; provider?: "google" } = {},
): Promise<TokenRecord | null> {
  const householdId = options.householdId ?? DEV_HOUSEHOLD_ID;
  const provider = options.provider ?? "google";

  const rows = await sql<TokenRow[]>`
    select id, member_id,
           access_token_encrypted, refresh_token_encrypted,
           access_token_expires_at, scope, account_email
    from oauth_tokens
    where household_id = ${householdId}
      and provider = ${provider}
      and account_email = ${accountEmail}
  `;
  const row = rows[0];
  return row ? toRecord(row) : null;
}

// =========================================================================
// Save (upsert on household + provider + email). account_email required.
// =========================================================================
export async function saveTokens(input: {
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: Date;
  scope: string;
  accountEmail: string;
  householdId?: string;
  memberId?: string;
  provider?: "google";
}): Promise<void> {
  if (!input.accountEmail) {
    throw new Error("accountEmail is required to save OAuth tokens");
  }

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
      ${input.accountEmail}
    )
    on conflict (household_id, provider, account_email) do update set
      access_token_encrypted  = excluded.access_token_encrypted,
      refresh_token_encrypted = coalesce(
        excluded.refresh_token_encrypted,
        oauth_tokens.refresh_token_encrypted
      ),
      access_token_expires_at = excluded.access_token_expires_at,
      scope                   = excluded.scope
  `;
}

// =========================================================================
// Delete one specific connection by its row id.
// =========================================================================
export async function deleteTokenById(
  id: string,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<void> {
  await sql`
    delete from oauth_tokens
    where household_id = ${householdId} and id = ${id}
  `;
}
