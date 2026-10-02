"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { sql } from "@/lib/db";
import { DEV_HOUSEHOLD_ID } from "@/lib/dev";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }
  return v;
}

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  if (typeof raw !== "string") throw new Error(`Missing field: ${key}`);
  const n = Number(raw.replace(/\D/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${key}`);
  return n;
}

// =========================================================================
// Set the monthly budget amount for a given category and period.
//
// Semantics:
//   - amount <= 0  → delete the budget row (category becomes "unbudgeted")
//   - amount >  0  → upsert on (household_id, category_id, period_year,
//                    period_month)
//
// Called from an autosaving input on /budgets — does NOT redirect. The
// Budgets page re-renders in place via revalidatePath.
// =========================================================================
export async function setBudgetAmountAction(
  formData: FormData,
): Promise<void> {
  const categoryId = str(formData, "categoryId");
  const year = num(formData, "year");
  const month = num(formData, "month");
  const amount = num(formData, "amount");

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }

  if (amount <= 0) {
    await sql`
      delete from budgets
      where household_id = ${DEV_HOUSEHOLD_ID}
        and category_id = ${categoryId}
        and period_year = ${year}
        and period_month = ${month}
    `;
  } else {
    await sql`
      insert into budgets (
        id, household_id, category_id, period_year, period_month,
        amount, currency
      ) values (
        ${randomUUID()}, ${DEV_HOUSEHOLD_ID}, ${categoryId}, ${year},
        ${month}, ${amount}, 'IDR'
      )
      on conflict (household_id, category_id, period_year, period_month)
      do update set amount = excluded.amount
    `;
  }

  revalidatePath("/budgets");
  revalidatePath("/");
}
