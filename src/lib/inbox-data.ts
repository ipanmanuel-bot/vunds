import {
  type CategoryInfo,
  type CategorySuggestion,
  type MerchantRule,
  suggestCategory,
} from "./categorize";
import { sql } from "./db";
import { DEV_HOUSEHOLD_ID } from "./dev";

interface PendingRow {
  id: string;
  amount: string;
  transaction_date: string;
  merchant: string | null;
  note: string | null;
  account_id: string | null;
  account_name: string | null;
  category_id: string | null;
  fund_id: string | null;
  imported_message_id: string | null;
  im_source: "manual" | "gmail" | null;
  im_source_message_id: string | null;
  im_provider: string | null;
  im_parse_status: "parsed" | "partial" | "unknown" | "failed" | null;
}

export interface PendingItem {
  id: string;
  amount: number;
  date: Date;
  merchant: string | null;
  note: string | null;
  accountId: string | null;
  accountName: string | null;
  importSource: "manual" | "gmail" | null;
  importProvider: string | null;
  importParseStatus: "parsed" | "partial" | "unknown" | "failed" | null;
  suggestion: CategorySuggestion | null;
}

// =========================================================================
// Load rules + categories (used by both list and detail)
// =========================================================================

async function loadRulesAndCategories(householdId: string): Promise<{
  rules: MerchantRule[];
  categoriesById: Map<string, CategoryInfo>;
}> {
  const [ruleRows, categoryRows] = await Promise.all([
    sql<
      {
        id: string;
        pattern: string;
        match_type: "exact" | "contains" | "regex";
        category_id: string | null;
        fund_id: string | null;
        priority: number;
      }[]
    >`
      select id, pattern, match_type, category_id, fund_id, priority
      from merchant_rules
      where household_id = ${householdId}
    `,
    sql<
      {
        id: string;
        name: string;
        parent_id: string | null;
        parent_name: string | null;
      }[]
    >`
      select c.id, c.name, c.parent_id, p.name as parent_name
      from categories c
      left join categories p on p.id = c.parent_id
      where c.household_id = ${householdId}
    `,
  ]);

  const rules: MerchantRule[] = ruleRows.map((r) => ({
    id: r.id,
    pattern: r.pattern,
    matchType: r.match_type,
    categoryId: r.category_id,
    fundId: r.fund_id,
    priority: r.priority,
  }));

  const categoriesById = new Map<string, CategoryInfo>();
  for (const c of categoryRows) {
    categoriesById.set(c.id, {
      id: c.id,
      name: c.name,
      parentId: c.parent_id,
      parentName: c.parent_name,
    });
  }

  return { rules, categoriesById };
}

// =========================================================================
// List
// =========================================================================

export async function listPending(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<PendingItem[]> {
  const [rows, { rules, categoriesById }] = await Promise.all([
    sql<PendingRow[]>`
      select
        t.id, t.amount, t.transaction_date, t.merchant, t.note,
        t.account_id, t.category_id, t.fund_id, t.imported_message_id,
        a.name as account_name,
        im.source as im_source,
        im.source_message_id as im_source_message_id,
        im.provider as im_provider,
        im.parse_status as im_parse_status
      from transactions t
      left join accounts a on a.id = t.account_id
      left join imported_messages im on im.id = t.imported_message_id
      where t.household_id = ${householdId}
        and t.status = 'pending'
      order by t.transaction_date desc, t.created_at desc
    `,
    loadRulesAndCategories(householdId),
  ]);

  return rows.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    date: new Date(`${r.transaction_date}T00:00:00.000Z`),
    merchant: r.merchant,
    note: r.note,
    accountId: r.account_id,
    accountName: r.account_name,
    importSource: r.im_source,
    importProvider: r.im_provider,
    importParseStatus: r.im_parse_status,
    suggestion: suggestCategory(r.merchant, rules, categoriesById),
  }));
}

// Count only (used by the dashboard MoneyInbox card).
export async function pendingCount(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    select count(*)::text as count
    from transactions
    where household_id = ${householdId} and status = 'pending'
  `;
  return Number(rows[0]?.count ?? 0);
}

// =========================================================================
// Detail
// =========================================================================

export async function getPending(
  id: string,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<PendingItem | null> {
  const [rows, { rules, categoriesById }] = await Promise.all([
    sql<PendingRow[]>`
      select
        t.id, t.amount, t.transaction_date, t.merchant, t.note,
        t.account_id, t.category_id, t.fund_id, t.imported_message_id,
        a.name as account_name,
        im.source as im_source,
        im.source_message_id as im_source_message_id,
        im.provider as im_provider,
        im.parse_status as im_parse_status
      from transactions t
      left join accounts a on a.id = t.account_id
      left join imported_messages im on im.id = t.imported_message_id
      where t.household_id = ${householdId}
        and t.status = 'pending'
        and t.id = ${id}
    `,
    loadRulesAndCategories(householdId),
  ]);

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    amount: Number(r.amount),
    date: new Date(`${r.transaction_date}T00:00:00.000Z`),
    merchant: r.merchant,
    note: r.note,
    accountId: r.account_id,
    accountName: r.account_name,
    importSource: r.im_source,
    importProvider: r.im_provider,
    importParseStatus: r.im_parse_status,
    suggestion: suggestCategory(r.merchant, rules, categoriesById),
  };
}
