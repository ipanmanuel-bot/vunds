"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { DEV_HOUSEHOLD_ID, DEV_VIEWER } from "@/lib/dev";
import {
  type Transaction,
  createCreditCardPayment,
  createExpense,
  createIncome,
  createTransfer,
} from "@/lib/finance";

// =========================================================================
// Form input readers (defensive but minimal — finance factories do the real
// validation, and the DB CHECK constraint is the final backstop. Any invalid
// data throws, which Next.js renders through its error boundary.)
// =========================================================================

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }
  return v;
}

function optionalStr(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  if (typeof v !== "string" || v.length === 0) return undefined;
  return v;
}

function num(formData: FormData, key: string): number {
  const raw = str(formData, key);
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${key}`);
  return n;
}

function date(formData: FormData, key: string): Date {
  const raw = str(formData, key); // input type="date" gives YYYY-MM-DD
  return new Date(`${raw}T00:00:00.000Z`);
}

// =========================================================================
// DB insert — one function, all four actions use it. The input is a well-
// formed `Transaction` produced by a finance factory, so there is nothing
// here to re-validate.
// =========================================================================

async function insertTransaction(tx: Transaction): Promise<void> {
  const dateStr = tx.transactionDate.toISOString().slice(0, 10);
  await sql`
    insert into transactions (
      id, household_id, created_by_member_id, type, status, amount, currency,
      transaction_date, account_id, counter_account_id, category_id,
      fund_id, counter_fund_id, refund_of_transaction_id, merchant, note
    ) values (
      ${tx.id}, ${DEV_HOUSEHOLD_ID}, ${DEV_VIEWER.memberId},
      ${tx.type}, ${tx.status}, ${tx.amount}, 'IDR',
      ${dateStr},
      ${tx.accountId ?? null}, ${tx.counterAccountId ?? null},
      ${tx.categoryId ?? null},
      ${tx.fundId ?? null}, ${tx.counterFundId ?? null},
      ${tx.refundOfTransactionId ?? null},
      ${tx.merchant ?? null}, ${tx.note ?? null}
    )
  `;
  revalidatePath("/transactions");
  revalidatePath("/");
}

// =========================================================================
// Actions — one per transaction type. Each calls the matching factory, which
// enforces the type-specific invariants (positive amount, distinct accounts
// for transfer/CC payment, etc). A CC payment can never become an expense
// because `createCreditCardPayment` only ever returns `type: 'credit_card_payment'`.
// =========================================================================

export async function createExpenseAction(formData: FormData): Promise<void> {
  const tx = createExpense({
    id: randomUUID(),
    amount: num(formData, "amount"),
    accountId: str(formData, "accountId"),
    categoryId: str(formData, "categoryId"),
    fundId: optionalStr(formData, "fundId"),
    transactionDate: date(formData, "transactionDate"),
    merchant: optionalStr(formData, "merchant"),
    note: optionalStr(formData, "note"),
  });
  await insertTransaction(tx);
  redirect("/transactions");
}

export async function createIncomeAction(formData: FormData): Promise<void> {
  const tx = createIncome({
    id: randomUUID(),
    amount: num(formData, "amount"),
    accountId: str(formData, "accountId"),
    categoryId: str(formData, "categoryId"),
    transactionDate: date(formData, "transactionDate"),
    note: optionalStr(formData, "note"),
  });
  await insertTransaction(tx);
  redirect("/transactions");
}

export async function createTransferAction(formData: FormData): Promise<void> {
  const tx = createTransfer({
    id: randomUUID(),
    amount: num(formData, "amount"),
    fromAccountId: str(formData, "fromAccountId"),
    toAccountId: str(formData, "toAccountId"),
    transactionDate: date(formData, "transactionDate"),
    note: optionalStr(formData, "note"),
  });
  await insertTransaction(tx);
  redirect("/transactions");
}

export async function createCreditCardPaymentAction(
  formData: FormData,
): Promise<void> {
  const tx = createCreditCardPayment({
    id: randomUUID(),
    amount: num(formData, "amount"),
    fromAccountId: str(formData, "fromAccountId"),
    creditCardAccountId: str(formData, "creditCardAccountId"),
    transactionDate: date(formData, "transactionDate"),
    note: optionalStr(formData, "note"),
  });
  await insertTransaction(tx);
  redirect("/transactions");
}
