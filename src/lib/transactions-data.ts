import { sql } from "./db";
import { DEV_HOUSEHOLD_ID } from "./dev";
import type {
  TransactionStatus,
  TransactionType,
} from "./finance";
import type { TransactionFilter } from "./transactions-filter";

// =========================================================================
// Row shape (shared with dashboard-data where possible)
// =========================================================================

interface ListRow {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  transaction_date: string;
  merchant: string | null;
  note: string | null;
  account_id: string | null;
  counter_account_id: string | null;
  category_id: string | null;
  fund_id: string | null;
  counter_fund_id: string | null;
  account_name: string | null;
  counter_account_name: string | null;
  category_name: string | null;
  category_parent_name: string | null;
  fund_name: string | null;
  counter_fund_name: string | null;
}

export interface TransactionListItem {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  date: Date;
  merchant: string | null;
  note: string | null;
  accountName: string | null;
  counterAccountName: string | null;
  categoryName: string | null;
  categoryParentName: string | null;
  fundName: string | null;
  counterFundName: string | null;
}

function toItem(r: ListRow): TransactionListItem {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    amount: Number(r.amount),
    date: new Date(`${r.transaction_date}T00:00:00.000Z`),
    merchant: r.merchant,
    note: r.note,
    accountName: r.account_name,
    counterAccountName: r.counter_account_name,
    categoryName: r.category_name,
    categoryParentName: r.category_parent_name,
    fundName: r.fund_name,
    counterFundName: r.counter_fund_name,
  };
}

// =========================================================================
// List
// =========================================================================

export async function listTransactions(
  filter: TransactionFilter,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<TransactionListItem[]> {
  // Owner filter: resolve the member's accessible accounts (owned + joint).
  // Transactions whose primary OR counter account is in that set are kept.
  // Fund allocations have no account, so they drop out when a member filter
  // is set — documented behaviour.
  let memberAccountIds: string[] | null = null;
  if (filter.memberId) {
    const rows = await sql<{ id: string }[]>`
      select id from accounts
      where household_id = ${householdId}
        and (owner_member_id = ${filter.memberId} or owner_member_id is null)
    `;
    memberAccountIds = rows.map((r) => r.id);
    // Guard against empty set — Postgres `= any('{}')` is well-defined but we
    // want an explicit short-circuit.
    if (memberAccountIds.length === 0) return [];
  }

  // Category filter: match the chosen category OR any descendant.
  let categoryIds: string[] | null = null;
  if (filter.categoryId) {
    const rows = await sql<{ id: string }[]>`
      with recursive tree as (
        select id from categories
        where household_id = ${householdId} and id = ${filter.categoryId}
        union all
        select c.id
        from categories c
        join tree t on c.parent_id = t.id
        where c.household_id = ${householdId}
      )
      select id from tree
    `;
    categoryIds = rows.map((r) => r.id);
  }

  const rows = await sql<ListRow[]>`
    select
      t.id, t.type, t.status, t.amount, t.transaction_date,
      t.merchant, t.note,
      t.account_id, t.counter_account_id, t.category_id,
      t.fund_id, t.counter_fund_id,
      a.name  as account_name,
      ca.name as counter_account_name,
      c.name  as category_name,
      cp.name as category_parent_name,
      f.name  as fund_name,
      cf.name as counter_fund_name
    from transactions t
    left join accounts  a  on a.id  = t.account_id
    left join accounts  ca on ca.id = t.counter_account_id
    left join categories c  on c.id  = t.category_id
    left join categories cp on cp.id = c.parent_id
    left join funds      f  on f.id  = t.fund_id
    left join funds      cf on cf.id = t.counter_fund_id
    where t.household_id = ${householdId}
      and t.transaction_date >= ${filter.from}
      and t.transaction_date <= ${filter.to}
      ${
        filter.accountId
          ? sql`and (t.account_id = ${filter.accountId} or t.counter_account_id = ${filter.accountId})`
          : sql``
      }
      ${
        categoryIds && categoryIds.length > 0
          ? sql`and t.category_id = any(${categoryIds}::uuid[])`
          : sql``
      }
      ${
        memberAccountIds
          ? sql`and (t.account_id = any(${memberAccountIds}::uuid[]) or t.counter_account_id = any(${memberAccountIds}::uuid[]))`
          : sql``
      }
    order by t.transaction_date desc, t.created_at desc
  `;

  return rows.map(toItem);
}

// =========================================================================
// Detail
// =========================================================================

export interface TransactionDetail extends TransactionListItem {
  currency: string;
  // Raw IDs — needed to prefill the edit form.
  accountId: string | null;
  counterAccountId: string | null;
  categoryId: string | null;
  fundId: string | null;
  counterFundId: string | null;
  createdByName: string | null;
  refundOfId: string | null;
  refundOfMerchant: string | null;
}

export async function getTransaction(
  id: string,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<TransactionDetail | null> {
  interface DetailRow extends ListRow {
    currency: string;
    created_by_name: string | null;
    refund_of_transaction_id: string | null;
    refund_of_merchant: string | null;
  }
  const rows = await sql<DetailRow[]>`
    select
      t.id, t.type, t.status, t.amount, t.currency, t.transaction_date,
      t.merchant, t.note,
      t.account_id, t.counter_account_id, t.category_id,
      t.fund_id, t.counter_fund_id,
      t.refund_of_transaction_id,
      a.name  as account_name,
      ca.name as counter_account_name,
      c.name  as category_name,
      cp.name as category_parent_name,
      f.name  as fund_name,
      cf.name as counter_fund_name,
      m.display_name as created_by_name,
      ref.merchant as refund_of_merchant
    from transactions t
    left join accounts  a  on a.id  = t.account_id
    left join accounts  ca on ca.id = t.counter_account_id
    left join categories c  on c.id  = t.category_id
    left join categories cp on cp.id = c.parent_id
    left join funds      f  on f.id  = t.fund_id
    left join funds      cf on cf.id = t.counter_fund_id
    left join household_members m on m.id = t.created_by_member_id
    left join transactions ref on ref.id = t.refund_of_transaction_id
    where t.household_id = ${householdId} and t.id = ${id}
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    ...toItem(r),
    currency: r.currency,
    accountId: r.account_id,
    counterAccountId: r.counter_account_id,
    categoryId: r.category_id,
    fundId: r.fund_id,
    counterFundId: r.counter_fund_id,
    createdByName: r.created_by_name,
    refundOfId: r.refund_of_transaction_id,
    refundOfMerchant: r.refund_of_merchant,
  };
}

// =========================================================================
// Options for FilterBar + forms
// =========================================================================

export interface AccountOption {
  id: string;
  name: string;
  type: "debit" | "cash" | "credit";
  ownerMemberId: string | null;
}

export interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  kind: "income" | "expense";
}

export interface MemberOption {
  id: string;
  displayName: string;
}

export interface FundOption {
  id: string;
  name: string;
}

export interface FormOptions {
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
  funds: FundOption[];
}

export async function getFormOptions(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<FormOptions> {
  const [accounts, categories, members, funds] = await Promise.all([
    sql<AccountOption[]>`
      select id, name, type, owner_member_id as "ownerMemberId"
      from accounts
      where household_id = ${householdId} and is_active = true
      order by type, name
    `,
    sql<
      {
        id: string;
        name: string;
        parent_id: string | null;
        parent_name: string | null;
        kind: "income" | "expense";
      }[]
    >`
      select c.id, c.name, c.parent_id, p.name as parent_name, c.kind
      from categories c
      left join categories p on p.id = c.parent_id
      where c.household_id = ${householdId} and c.is_archived = false
      order by coalesce(p.sort_order, c.sort_order), c.sort_order, c.name
    `,
    sql<{ id: string; display_name: string }[]>`
      select id, display_name
      from household_members
      where household_id = ${householdId}
      order by display_name
    `,
    sql<{ id: string; name: string }[]>`
      select id, name from funds
      where household_id = ${householdId} and is_archived = false
      order by name
    `,
  ]);

  return {
    accounts,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id,
      parentName: c.parent_name,
      kind: c.kind,
    })),
    members: members.map((m) => ({ id: m.id, displayName: m.display_name })),
    funds,
  };
}
