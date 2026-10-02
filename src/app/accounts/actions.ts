"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAccount } from "@/lib/accounts-data";
import { sql } from "@/lib/db";
import { DEV_HOUSEHOLD_ID, DEV_VIEWER } from "@/lib/dev";

// =========================================================================
// Form input helpers
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
  return v.trim() || null;
}

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  if (typeof raw !== "string") throw new Error(`Missing field: ${key}`);
  const stripped = raw.replace(/\D/g, "");
  const n = Number(stripped);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${key}`);
  return n;
}

type AccountType = "debit" | "cash" | "credit";

function type(formData: FormData): AccountType {
  const v = str(formData, "type");
  if (v !== "debit" && v !== "cash" && v !== "credit") {
    throw new Error("Invalid account type");
  }
  return v;
}

// Normalise identifier → digits only. Users can type "**** 1234" and we
// store "1234", matching what the parsers extract.
function normaliseIdentifier(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length > 0 ? digits : null;
}

function invalidate(id?: string): void {
  revalidatePath("/accounts");
  if (id) revalidatePath(`/accounts/${id}`);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
}

// =========================================================================
// Create
// =========================================================================

export async function createAccountAction(formData: FormData): Promise<void> {
  const id = randomUUID();
  const name = str(formData, "name").trim();
  const t = type(formData);
  const openingBalance = num(formData, "openingBalance");
  const creditLimitRaw = optionalStr(formData, "creditLimit");
  const ownerMemberId = optionalStr(formData, "ownerMemberId");
  const externalIdentifier = normaliseIdentifier(
    optionalStr(formData, "externalIdentifier"),
  );

  // Enforce the schema's accounts_credit_limit_only_on_credit check in app
  // land so we fail with a readable error instead of a DB constraint hit.
  let creditLimit: number | null = null;
  if (t === "credit") {
    if (!creditLimitRaw) {
      throw new Error("Credit limit is required for credit card accounts");
    }
    const n = Number(creditLimitRaw.replace(/\D/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("Credit limit must be positive");
    }
    creditLimit = n;
  }

  // Cash accounts don't have an identifier even if the user typed one.
  const identifierToStore = t === "cash" ? null : externalIdentifier;

  await sql`
    insert into accounts (
      id, household_id, owner_member_id, name, type,
      currency, opening_balance, credit_limit, external_identifier
    ) values (
      ${id}, ${DEV_HOUSEHOLD_ID}, ${ownerMemberId}, ${name}, ${t},
      'IDR', ${openingBalance}, ${creditLimit}, ${identifierToStore}
    )
  `;

  invalidate(id);
  redirect(`/accounts/${id}`);
}

// =========================================================================
// Update
//
// Deliberately NOT touching `type` — converting between debit/credit after
// transactions exist is a mess (balance math changes semantics). If you
// mis-typed the account type at creation, archive and add a new one.
//
// Current-balance semantics (reconciliation):
//   - Edit form submits `currentBalance` — the balance the user wants the
//     account to now show.
//   - We load the current computed balance via the finance library and
//     compute delta.
//   - Non-zero delta → create an adjustment_increase / adjustment_decrease
//     transaction dated today. opening_balance NEVER changes after
//     creation, preserving the audit trail.
// =========================================================================

export async function updateAccountAction(formData: FormData): Promise<void> {
  const id = str(formData, "accountId");
  const name = str(formData, "name").trim();
  const currentBalanceInput = num(formData, "currentBalance");
  const creditLimitRaw = optionalStr(formData, "creditLimit");
  const ownerMemberId = optionalStr(formData, "ownerMemberId");
  const externalIdentifier = normaliseIdentifier(
    optionalStr(formData, "externalIdentifier"),
  );
  const adjustmentNote = optionalStr(formData, "adjustmentNote");

  const account = await getAccount(id);
  if (!account) throw new Error("Account not found");

  let creditLimit: number | null = null;
  if (account.type === "credit") {
    if (!creditLimitRaw) {
      throw new Error("Credit limit is required for credit card accounts");
    }
    const n = Number(creditLimitRaw.replace(/\D/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("Credit limit must be positive");
    }
    creditLimit = n;
  }

  const identifierToStore =
    account.type === "cash" ? null : externalIdentifier;

  // Compute delta vs. the account's current computed balance.
  // Debit/cash balance = cash on hand; credit balance = outstanding owed.
  const currentValue =
    account.type === "credit" ? (account.outstanding ?? 0) : (account.balance ?? 0);
  const delta = currentBalanceInput - currentValue;

  await sql.begin(async (db) => {
    await db`
      update accounts set
        name                 = ${name},
        owner_member_id      = ${ownerMemberId},
        credit_limit         = ${creditLimit},
        external_identifier  = ${identifierToStore}
      where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
    `;

    if (delta !== 0) {
      const direction = delta > 0 ? "adjustment_increase" : "adjustment_decrease";
      const magnitude = Math.abs(delta);
      const dateStr = new Date().toISOString().slice(0, 10);
      await db`
        insert into transactions (
          id, household_id, created_by_member_id, type, status, amount, currency,
          transaction_date, account_id, note
        ) values (
          ${randomUUID()}, ${DEV_HOUSEHOLD_ID}, ${DEV_VIEWER.memberId},
          ${direction}, 'confirmed', ${magnitude}, 'IDR',
          ${dateStr}, ${id},
          ${adjustmentNote ?? `Balance correction (${delta > 0 ? "+" : "−"}${magnitude})`}
        )
      `;
    }
  });

  invalidate(id);
  redirect(`/accounts/${id}`);
}

// =========================================================================
// Delete
//
// Only permitted when NO transactions reference the account — otherwise
// deleting would orphan financial history (and the DB would reject it via
// the FK anyway). "Mistakenly added" case: a brand-new account you want to
// scrub. For an account with history, archive it instead.
// =========================================================================

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const id = str(formData, "accountId");

  const [row] = await sql<{ count: string }[]>`
    select count(*)::text as count
    from transactions
    where household_id = ${DEV_HOUSEHOLD_ID}
      and (account_id = ${id} or counter_account_id = ${id})
  `;
  const txCount = Number(row?.count ?? 0);
  if (txCount > 0) {
    throw new Error(
      `Cannot delete: ${txCount} transaction(s) still reference this account. ` +
        `Delete those transactions first, or archive the account instead.`,
    );
  }

  await sql`
    delete from accounts
    where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
  `;

  invalidate();
  redirect("/accounts");
}
