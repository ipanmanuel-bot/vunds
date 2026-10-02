import { sql } from "./db";
import { DEV_HOUSEHOLD_ID } from "./dev";
import {
  type Transaction,
  type TransactionStatus,
  type TransactionType,
  fundAllocated,
  fundSpent,
} from "./finance";

interface FundRow {
  id: string;
  name: string;
  target_amount: string | null;
  currency: string;
  is_archived: boolean;
}

interface TxRow {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  transaction_date: string;
  account_id: string | null;
  counter_account_id: string | null;
  category_id: string | null;
  fund_id: string | null;
  counter_fund_id: string | null;
  refund_of_transaction_id: string | null;
  merchant: string | null;
  note: string | null;
}

export interface FundSummary {
  id: string;
  name: string;
  targetAmount: number | null;
  currency: string;
  allocated: number;
  spent: number;
  // What's left in the pocket right now. In the envelope model
  // (docs/financial-logic.md §8), this is the key number — "how much can
  // I still spend from this fund without going negative?"
  remaining: number;
  progressPercent: number | null; // allocated / target; null if no target
}

function rowToTransaction(r: TxRow): Transaction {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    amount: Number(r.amount),
    transactionDate: new Date(`${r.transaction_date}T00:00:00.000Z`),
    accountId: r.account_id ?? undefined,
    counterAccountId: r.counter_account_id ?? undefined,
    categoryId: r.category_id ?? undefined,
    fundId: r.fund_id ?? undefined,
    counterFundId: r.counter_fund_id ?? undefined,
    refundOfTransactionId: r.refund_of_transaction_id ?? undefined,
    merchant: r.merchant ?? undefined,
    note: r.note ?? undefined,
  };
}

function toSummary(r: FundRow, transactions: Transaction[]): FundSummary {
  const target = r.target_amount ? Number(r.target_amount) : null;
  const allocated = fundAllocated(r.id, transactions);
  const spent = fundSpent(r.id, transactions);
  const progressPercent =
    target && target > 0
      ? Math.max(0, Math.min(100, Math.round((allocated / target) * 100)))
      : null;
  return {
    id: r.id,
    name: r.name,
    targetAmount: target,
    currency: r.currency,
    allocated,
    spent,
    remaining: allocated - spent,
    progressPercent,
  };
}

export async function listFunds(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<FundSummary[]> {
  const [fundRows, txRows] = await Promise.all([
    sql<FundRow[]>`
      select id, name, target_amount, currency, is_archived
      from funds
      where household_id = ${householdId} and is_archived = false
      order by name
    `,
    sql<TxRow[]>`
      select id, type, status, amount, transaction_date,
             account_id, counter_account_id, category_id,
             fund_id, counter_fund_id, refund_of_transaction_id,
             merchant, note
      from transactions
      where household_id = ${householdId}
    `,
  ]);
  const transactions = txRows.map(rowToTransaction);
  return fundRows.map((r) => toSummary(r, transactions));
}

export async function getFund(
  id: string,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<FundSummary | null> {
  const [fundRow] = await sql<FundRow[]>`
    select id, name, target_amount, currency, is_archived
    from funds
    where household_id = ${householdId} and id = ${id}
  `;
  if (!fundRow) return null;

  const txRows = await sql<TxRow[]>`
    select id, type, status, amount, transaction_date,
           account_id, counter_account_id, category_id,
           fund_id, counter_fund_id, refund_of_transaction_id,
           merchant, note
    from transactions
    where household_id = ${householdId}
  `;
  return toSummary(fundRow, txRows.map(rowToTransaction));
}

// =========================================================================
// Fund-attached activity
//
// Returns transactions tied to this fund — expenses tagged to it and the
// fund_allocation movements that touch it on either side. Shape matches the
// transactions list components so we can reuse <TransactionList>.
// =========================================================================

import type { TransactionListItem } from "./transactions-data";

interface FundTxRow {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  transaction_date: string;
  merchant: string | null;
  note: string | null;
  account_name: string | null;
  counter_account_name: string | null;
  category_name: string | null;
  category_parent_name: string | null;
  fund_name: string | null;
  counter_fund_name: string | null;
}

export async function getFundActivity(
  fundId: string,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<TransactionListItem[]> {
  const rows = await sql<FundTxRow[]>`
    select
      t.id, t.type, t.status, t.amount, t.transaction_date,
      t.merchant, t.note,
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
      and (t.fund_id = ${fundId} or t.counter_fund_id = ${fundId})
    order by t.transaction_date desc, t.created_at desc
  `;
  return rows.map((r) => ({
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
  }));
}
