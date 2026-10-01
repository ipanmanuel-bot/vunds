import { sql } from "./db";
import { DEV_HOUSEHOLD_ID } from "./dev";

export interface CategoryManagementRow {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  kind: "income" | "expense";
  sortOrder: number;
  transactionCount: number;
}

export interface CategoryGroup {
  parent: CategoryManagementRow;
  children: CategoryManagementRow[];
}

export async function listCategoriesForManagement(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<CategoryManagementRow[]> {
  const rows = await sql<
    {
      id: string;
      name: string;
      parent_id: string | null;
      parent_name: string | null;
      kind: "income" | "expense";
      sort_order: number;
      transaction_count: string;
    }[]
  >`
    select
      c.id,
      c.name,
      c.parent_id,
      p.name as parent_name,
      c.kind,
      c.sort_order,
      (
        select count(*) from transactions t
        where t.household_id = ${householdId} and t.category_id = c.id
      )::text as transaction_count
    from categories c
    left join categories p on p.id = c.parent_id
    where c.household_id = ${householdId}
      and c.is_archived = false
    order by
      coalesce(p.sort_order, c.sort_order),
      coalesce(p.name, c.name),
      c.sort_order,
      c.name
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    parentName: r.parent_name,
    kind: r.kind,
    sortOrder: r.sort_order,
    transactionCount: Number(r.transaction_count),
  }));
}

// Group categories by parent for display. Each top-level category gets its
// own group, with its subcategories listed under it.
export function groupCategories(
  rows: readonly CategoryManagementRow[],
): CategoryGroup[] {
  const parents = rows.filter((r) => r.parentId == null);
  const byParent = new Map<string, CategoryManagementRow[]>();
  for (const r of rows) {
    if (r.parentId) {
      const list = byParent.get(r.parentId) ?? [];
      list.push(r);
      byParent.set(r.parentId, list);
    }
  }
  return parents.map((parent) => ({
    parent,
    children: byParent.get(parent.id) ?? [],
  }));
}
