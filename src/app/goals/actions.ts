"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sql } from "@/lib/db";
import { DEV_HOUSEHOLD_ID } from "@/lib/dev";

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
