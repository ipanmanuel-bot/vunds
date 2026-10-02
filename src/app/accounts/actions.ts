"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { DEV_HOUSEHOLD_ID } from "@/lib/dev";

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
  const stripped = raw.replace(/[^\d.-]/g, "");
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
    const n = Number(creditLimitRaw.replace(/[^\d.-]/g, ""));
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
// =========================================================================

export async function updateAccountAction(formData: FormData): Promise<void> {
  const id = str(formData, "accountId");
  const name = str(formData, "name").trim();
  const openingBalance = num(formData, "openingBalance");
  const creditLimitRaw = optionalStr(formData, "creditLimit");
  const ownerMemberId = optionalStr(formData, "ownerMemberId");
  const externalIdentifier = normaliseIdentifier(
    optionalStr(formData, "externalIdentifier"),
  );

  // Resolve current type from DB — the form shouldn't allow changing it,
  // but we check so we can enforce the credit_limit invariant correctly.
  const [current] = await sql<{ type: AccountType }[]>`
    select type from accounts
    where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
  `;
  if (!current) throw new Error("Account not found");

  let creditLimit: number | null = null;
  if (current.type === "credit") {
    if (!creditLimitRaw) {
      throw new Error("Credit limit is required for credit card accounts");
    }
    const n = Number(creditLimitRaw.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("Credit limit must be positive");
    }
    creditLimit = n;
  }

  const identifierToStore =
    current.type === "cash" ? null : externalIdentifier;

  await sql`
    update accounts set
      name                 = ${name},
      owner_member_id      = ${ownerMemberId},
      opening_balance      = ${openingBalance},
      credit_limit         = ${creditLimit},
      external_identifier  = ${identifierToStore}
    where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
  `;

  invalidate(id);
  redirect(`/accounts/${id}`);
}
