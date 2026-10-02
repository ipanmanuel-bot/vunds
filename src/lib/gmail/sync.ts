// Sync orchestrator.
//
// One function handles both the real Gmail path and the fixture path. Shape:
//
//   for each incoming message:
//     1. dedup on (household_id, source, source_message_id)
//     2. find a parser via the registry
//     3. parse — may return null (unknown) or confidence='low' (partial)
//     4. persist:
//        - imported_messages row with the appropriate status
//        - IF confidence='high': a `status=pending` transaction row
//
// Low-confidence or no-match messages never become transactions. The user
// sees them only as context in the Inbox if we choose to surface them.

import { randomUUID } from "node:crypto";

import { sql } from "../db";
import { DEV_HOUSEHOLD_ID } from "../dev";
import { listTokens } from "../gmail-tokens";
import { findParser } from "../parsers/registry";
import type { ParsedTransaction } from "../parsers/types";
import {
  flattenMessage,
  GmailClient,
  type FlattenedMessage,
} from "./client";
import { BANK_FROM_HINTS, buildQuery } from "./fetcher";
import { fixtureMessages } from "./fixtures";

export interface SyncResult {
  fetched: number;
  duplicates: number;
  pendingCreated: number;
  partialStored: number;
  unknownStored: number;
  errors: string[];
}

const EMPTY_RESULT: SyncResult = {
  fetched: 0,
  duplicates: 0,
  pendingCreated: 0,
  partialStored: 0,
  unknownStored: 0,
  errors: [],
};

// =========================================================================
// Account-identifier resolution
//
// Load once per sync from `accounts.external_identifier`, then match parsed
// "card ending in 1234" strings. If two accounts share the same tail digits
// (rare), the first one (sorted by account.name) wins — the user can correct
// the account on the Inbox form before confirming.
// =========================================================================

async function loadAccountIdentifierMap(
  householdId: string,
): Promise<Map<string, string>> {
  const rows = await sql<{ id: string; external_identifier: string }[]>`
    select id, external_identifier
    from accounts
    where household_id = ${householdId}
      and external_identifier is not null
      and is_active = true
    order by name
  `;
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!map.has(r.external_identifier)) {
      map.set(r.external_identifier, r.id);
    }
  }
  return map;
}

function resolveAccount(
  identifier: string | undefined,
  idMap: Map<string, string>,
): string | null {
  if (!identifier) return null;
  return idMap.get(identifier) ?? null;
}

// =========================================================================
// Core sync — operates on an array of already-fetched messages
// =========================================================================

async function processMessages(
  messages: FlattenedMessage[],
  householdId: string,
): Promise<SyncResult> {
  const result: SyncResult = { ...EMPTY_RESULT, errors: [] };
  result.fetched = messages.length;

  const accountIdMap = await loadAccountIdentifierMap(householdId);

  for (const msg of messages) {
    try {
      // 1. Parse up front. Cheap, pure, no DB round-trip. We need the result
      //    to decide what to persist alongside the imported_messages row.
      const parser = findParser(msg);
      const parsed: ParsedTransaction | null = parser ? parser.parse(msg) : null;

      let parseStatus: "parsed" | "partial" | "unknown" | "failed";
      let createTransaction = false;
      if (!parser) {
        parseStatus = "unknown";
      } else if (!parsed) {
        parseStatus = "failed";
      } else if (parsed.confidence === "low") {
        parseStatus = "partial";
      } else {
        parseStatus = "parsed";
        createTransaction = true;
      }

      // 2. Dedup + persist atomically. INSERT ... ON CONFLICT DO NOTHING
      //    RETURNING id makes this race-safe: concurrent syncs can't both
      //    create a row for the same (household, source, source_message_id).
      //    If RETURNING yields no row, we know this message was already
      //    imported — count as duplicate and move on.
      const importId = randomUUID();
      let wasInserted = false;

      await sql.begin(async (db) => {
        const inserted = await db<{ id: string }[]>`
          insert into imported_messages (
            id, household_id, source, source_message_id, provider,
            parse_status, parsed_at, raw_metadata
          ) values (
            ${importId}, ${householdId}, 'gmail', ${msg.id},
            ${parser?.provider ?? null},
            ${parseStatus},
            ${parsed ? new Date() : null},
            ${db.json({
              from: msg.from,
              subject: msg.subject,
              ...(parsed?.rawMetadata ?? {}),
            })}
          )
          on conflict (household_id, source, source_message_id) do nothing
          returning id
        `;

        if (inserted.length === 0) return; // duplicate — do nothing
        wasInserted = true;

        if (createTransaction && parsed) {
          const dateStr = parsed.transactionDate.toISOString().slice(0, 10);
          await db`
            insert into transactions (
              id, household_id, type, status, amount, currency,
              transaction_date, account_id, merchant, imported_message_id
            ) values (
              ${randomUUID()}, ${householdId}, ${parsed.type}, 'pending',
              ${parsed.amount}, ${parsed.currency},
              ${dateStr},
              ${resolveAccount(parsed.accountIdentifier, accountIdMap)},
              ${parsed.merchant ?? null},
              ${importId}
            )
          `;
        }
      });

      if (!wasInserted) result.duplicates += 1;
      else if (createTransaction) result.pendingCreated += 1;
      else if (parseStatus === "partial") result.partialStored += 1;
      else result.unknownStored += 1;
    } catch (e) {
      result.errors.push(
        `Message ${msg.id}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return result;
}

// =========================================================================
// Public entry points
// =========================================================================

export async function syncGmail(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<SyncResult> {
  const connections = await listTokens({ householdId });
  if (connections.length === 0) {
    return {
      ...EMPTY_RESULT,
      errors: ["No Gmail connected. Click 'Connect Gmail' first."],
    };
  }

  const query = buildQuery({ fromHints: BANK_FROM_HINTS });
  const allMessages: FlattenedMessage[] = [];
  const errors: string[] = [];

  // One mailbox at a time. We DON'T parallelise — Google rate-limits per
  // user, and a 2-mailbox household doesn't need the extra complexity.
  for (const token of connections) {
    const client = new GmailClient(token);

    let ids: string[];
    try {
      ids = await client.listMessages(query, 50);
    } catch (e) {
      errors.push(
        `[${token.accountEmail}] Gmail list failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      continue;
    }

    for (const id of ids) {
      try {
        const res = await client.getMessage(id);
        allMessages.push(flattenMessage(res));
      } catch (e) {
        console.error(
          `Gmail get failed for ${token.accountEmail}/${id}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      }
    }
  }

  const result = await processMessages(allMessages, householdId);
  result.errors.push(...errors);
  return result;
}

export async function syncFixtures(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<SyncResult> {
  return processMessages(fixtureMessages, householdId);
}
