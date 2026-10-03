"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sql, withTx } from "@/lib/db";
import { DEV_HOUSEHOLD_ID } from "@/lib/dev";

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

function invalidate(): void {
  revalidatePath("/categories");
  revalidatePath("/budgets");
  revalidatePath("/transactions");
  revalidatePath("/transactions/new");
  revalidatePath("/inbox");
  revalidatePath("/");
}

// =========================================================================
// Create top-level category
// =========================================================================
export async function createCategoryAction(formData: FormData): Promise<void> {
  const name = str(formData, "name").trim();
  const kind = str(formData, "kind");
  if (kind !== "income" && kind !== "expense") {
    throw new Error("kind must be income or expense");
  }

  const [{ max_sort }] = await sql<{ max_sort: number }[]>`
    select coalesce(max(sort_order), 0) as max_sort
    from categories
    where household_id = ${DEV_HOUSEHOLD_ID} and parent_id is null
  `;

  await sql`
    insert into categories (
      id, household_id, parent_id, name, kind, sort_order
    ) values (
      ${randomUUID()}, ${DEV_HOUSEHOLD_ID}, null, ${name}, ${kind},
      ${max_sort + 100}
    )
  `;

  invalidate();
  redirect("/categories");
}

// =========================================================================
// Create subcategory under an existing parent
// =========================================================================
export async function createSubcategoryAction(
  formData: FormData,
): Promise<void> {
  const name = str(formData, "name").trim();
  const parentId = str(formData, "parentId");

  // Subcategory inherits kind from parent — enforce it server-side so the
  // DB stays consistent even if someone tampers with the form.
  const [parent] = await sql<
    { kind: "income" | "expense" }[]
  >`
    select kind from categories
    where household_id = ${DEV_HOUSEHOLD_ID}
      and id = ${parentId}
      and is_archived = false
  `;
  if (!parent) throw new Error("Parent category not found");

  const [{ max_sort }] = await sql<{ max_sort: number }[]>`
    select coalesce(max(sort_order), -1) as max_sort
    from categories
    where household_id = ${DEV_HOUSEHOLD_ID} and parent_id = ${parentId}
  `;

  await sql`
    insert into categories (
      id, household_id, parent_id, name, kind, sort_order
    ) values (
      ${randomUUID()}, ${DEV_HOUSEHOLD_ID}, ${parentId}, ${name},
      ${parent.kind}, ${max_sort + 1}
    )
  `;

  invalidate();
  redirect("/categories");
}

// =========================================================================
// Rename
//
// No redirect — this action is called from a client component on every
// debounced blur/Enter during autosave, so we only revalidate and return.
// =========================================================================
export async function renameCategoryAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const name = str(formData, "name").trim();
  if (!name) return;

  await sql`
    update categories
    set name = ${name}
    where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
  `;

  invalidate();
}

// =========================================================================
// Archive (soft delete)
//
// Archived categories are hidden from new-transaction forms (getFormOptions
// filters on `is_archived = false`), but existing transactions keep their
// reference intact so historical reporting is undisturbed.
//
// Archiving a top-level category also archives its subcategories, since a
// subcategory without a visible parent would be orphaned in the UI.
//
// Guard: refuse to archive if any transaction (in this category OR any
// descendant) references the category. The client already prevents the
// confirm dialog from opening when the server-rendered count is > 0; this
// is defense in depth against races and tampering.
// =========================================================================
export async function archiveCategoryAction(formData: FormData): Promise<void> {
  const id = str(formData, "id");

  const rows = await sql<{ count: string }[]>`
    with recursive descendants as (
      select id from categories
      where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
      union all
      select c.id from categories c
      join descendants d on c.parent_id = d.id
      where c.household_id = ${DEV_HOUSEHOLD_ID}
    )
    select count(*)::text as count
    from transactions t
    where t.household_id = ${DEV_HOUSEHOLD_ID}
      and t.category_id in (select id from descendants)
  `;
  const count = Number(rows[0]?.count ?? 0);
  if (count > 0) {
    throw new Error(
      `Cannot archive: ${count} transaction(s) still reference this category or its subcategories.`,
    );
  }

  await withTx(async (txn) => {
    await txn`
      update categories set is_archived = true
      where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
    `;
    await txn`
      update categories set is_archived = true
      where household_id = ${DEV_HOUSEHOLD_ID} and parent_id = ${id}
    `;
  });

  invalidate();
}

// Intentional stub kept to document the "unarchive" path; not wired to the UI
// yet. Flip is_archived back to false by id if we need it later.
export async function unarchiveCategoryAction(
  formData: FormData,
): Promise<void> {
  const id = str(formData, "id");
  await sql`
    update categories set is_archived = false
    where household_id = ${DEV_HOUSEHOLD_ID} and id = ${id}
  `;
  invalidate();
  // Avoid dead-code warning.
  void optionalStr;
}
