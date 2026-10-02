"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { DEV_HOUSEHOLD_ID, DEV_VIEWER } from "@/lib/dev";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }
  return v;
}

// Optional positive money input. Empty / zero / non-numeric → null (meaning
// "no target set" — the fund becomes an ongoing pocket rather than a goal
// with a finish line).
function optionalPositiveNum(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.length === 0) return null;
  const stripped = raw.replace(/[^\d.-]/g, "");
  if (stripped.length === 0) return null;
  const n = Number(stripped);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function requiredPositiveNum(formData: FormData, key: string): number {
  const raw = formData.get(key);
  if (typeof raw !== "string") throw new Error(`Missing field: ${key}`);
  const stripped = raw.replace(/[^\d.-]/g, "");
  const n = Number(stripped);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${key} must be a positive number`);
  }
  return n;
}

function optionalStr(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string" || v.length === 0) return null;
  return v.trim() || null;
}

function invalidate(id?: string): void {
  revalidatePath("/goals");
  revalidatePath("/");
  revalidatePath("/transactions");
  if (id) revalidatePath(`/goals/${id}`);
}

export async function createFundAction(formData: FormData): Promise<void> {
  const id = randomUUID();
  const name = str(formData, "name").trim();
  const targetAmount = optionalPositiveNum(formData, "targetAmount");

  await sql`
    insert into funds (id, household_id, name, target_amount, currency)
    values (${id}, ${DEV_HOUSEHOLD_ID}, ${name}, ${targetAmount}, 'IDR')
  `;

  invalidate(id);
  redirect(`/goals/${id}`);
}

// =========================================================================
// Allocate money into a fund.
//
// Per docs/financial-logic.md: fund allocation is PURELY virtual. It
// changes what portion of your money is earmarked for a goal; account
// balances do NOT change. Writing a `fund_allocation` transaction with
// counter_fund_id = this fund (and fund_id NULL = from the implicit
// "unallocated" pool) increases this fund's allocated amount by `amount`.
// The DB CHECK constraint enforces the shape (no account_id, no
// category_id, fund != counter_fund).
//
// Later: an optional "from fund" dropdown to move money between funds.
// For now, allocation always comes from the unallocated pool.
// =========================================================================

export async function allocateToFundAction(formData: FormData): Promise<void> {
  const fundId = str(formData, "fundId");
  const amount = requiredPositiveNum(formData, "amount");
  const note = optionalStr(formData, "note");
  const dateStr = new Date().toISOString().slice(0, 10);

  await sql`
    insert into transactions (
      id, household_id, created_by_member_id, type, status, amount, currency,
      transaction_date, counter_fund_id, note
    ) values (
      ${randomUUID()}, ${DEV_HOUSEHOLD_ID}, ${DEV_VIEWER.memberId},
      'fund_allocation', 'confirmed', ${amount}, 'IDR',
      ${dateStr}, ${fundId}, ${note}
    )
  `;

  invalidate(fundId);
  redirect(`/goals/${fundId}`);
}
