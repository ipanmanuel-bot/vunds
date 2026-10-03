"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sql, withTx } from "@/lib/db";
import { DEV_HOUSEHOLD_ID, DEV_VIEWER } from "@/lib/dev";
import { deleteTokenById } from "@/lib/gmail-tokens";
import { syncFixtures, syncGmail, type SyncResult } from "@/lib/gmail/sync";

// =========================================================================
// Form input readers
// =========================================================================

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }
  return v;
}

function optionalStr(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string" || v.length === 0) return null;
  return v;
}

function hasFlag(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

// =========================================================================
// Confirm — promote a pending transaction to `confirmed`, write the final
// category/fund/merchant, and (if the user ticked the checkbox) upsert a
// merchant rule so the next similar import auto-categorises.
// =========================================================================

export async function confirmPendingAction(formData: FormData): Promise<void> {
  const transactionId = str(formData, "transactionId");
  const categoryId = str(formData, "categoryId"); // required for confirm
  const fundId = optionalStr(formData, "fundId");
  const merchant = optionalStr(formData, "merchant");
  const note = optionalStr(formData, "note");
  const saveAsRule = hasFlag(formData, "saveAsRule");

  await withTx(async (txn) => {
    // 1. Promote the pending transaction.
    const [updated] = await txn<{ id: string }[]>`
      update transactions
      set status      = 'confirmed',
          category_id = ${categoryId},
          fund_id     = ${fundId},
          merchant    = ${merchant},
          note        = ${note},
          created_by_member_id = coalesce(created_by_member_id, ${DEV_VIEWER.memberId})
      where household_id = ${DEV_HOUSEHOLD_ID}
        and id = ${transactionId}
        and status = 'pending'
      returning id
    `;
    if (!updated) {
      throw new Error(
        "Pending transaction not found or already resolved",
      );
    }

    // 2. Optional rule learning. Only create/update a rule when we have both
    //    a merchant string and a category, and the user asked for it. Exact
    //    match by default — users can edit to `contains` later if they want
    //    a keyword rule across similar merchants.
    if (saveAsRule && merchant && categoryId) {
      await txn`
        insert into merchant_rules (
          id, household_id, pattern, match_type, category_id, fund_id,
          priority, created_from_transaction_id
        )
        values (
          ${randomUUID()}, ${DEV_HOUSEHOLD_ID}, ${merchant}, 'exact',
          ${categoryId}, ${fundId}, 50, ${transactionId}
        )
        on conflict (household_id, pattern, match_type)
        do update set
          category_id = excluded.category_id,
          fund_id     = excluded.fund_id,
          created_from_transaction_id = excluded.created_from_transaction_id
      `;
    }
  });

  revalidatePath("/inbox");
  revalidatePath("/transactions");
  revalidatePath("/");
  redirect("/inbox");
}

// =========================================================================
// Gmail sync — fetch recent bank mails, dedup, parse, create pending rows.
// Both actions share the same orchestrator; one is wired to real Gmail,
// the other to bundled fixtures for the demo path.
// =========================================================================

function encodeResult(label: string, r: SyncResult): string {
  const parts = [
    `source=${label}`,
    `fetched=${r.fetched}`,
    `pending=${r.pendingCreated}`,
    `partial=${r.partialStored}`,
    `unknown=${r.unknownStored}`,
    `duplicates=${r.duplicates}`,
  ];
  if (r.errors.length > 0) parts.push(`errors=${r.errors.length}`);
  return parts.join("|");
}

export async function syncGmailAction(): Promise<void> {
  const r = await syncGmail();
  revalidatePath("/inbox");
  revalidatePath("/");
  redirect(`/inbox?sync=${encodeURIComponent(encodeResult("gmail", r))}`);
}

export async function syncFixturesAction(): Promise<void> {
  const r = await syncFixtures();
  revalidatePath("/inbox");
  revalidatePath("/");
  redirect(`/inbox?sync=${encodeURIComponent(encodeResult("fixtures", r))}`);
}

// Delete imported_messages rows that didn't produce a transaction so the
// next Gmail sync re-processes them with the current parsers. Useful when
// parsers have been updated to handle a previously-failed format — the
// dedup uniqueness constraint would otherwise skip those messages forever.
export async function resetFailedImportsAction(): Promise<void> {
  await sql`
    delete from imported_messages
    where household_id = ${DEV_HOUSEHOLD_ID}
      and parse_status in ('failed', 'partial', 'unknown')
      and not exists (
        select 1 from transactions t
        where t.imported_message_id = imported_messages.id
      )
  `;
  revalidatePath("/inbox");
  redirect("/inbox");
}

export async function disconnectGmailAction(formData: FormData): Promise<void> {
  // Each connection is identified by its token-row id so the user can remove
  // one Gmail while keeping another connected.
  const tokenId = str(formData, "tokenId");
  await deleteTokenById(tokenId);
  revalidatePath("/inbox");
  redirect("/inbox?gmail=disconnected");
}

// =========================================================================
// Reject — mark the pending transaction as rejected so it is excluded from
// reporting (per docs/financial-logic.md §14) without deleting history.
// =========================================================================

export async function rejectPendingAction(formData: FormData): Promise<void> {
  const transactionId = str(formData, "transactionId");

  await sql`
    update transactions
    set status = 'rejected'
    where household_id = ${DEV_HOUSEHOLD_ID}
      and id = ${transactionId}
      and status = 'pending'
  `;

  revalidatePath("/inbox");
  revalidatePath("/transactions");
  revalidatePath("/");
  redirect("/inbox");
}
