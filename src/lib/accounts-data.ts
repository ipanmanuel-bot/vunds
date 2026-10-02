import { sql } from "./db";
import { DEV_HOUSEHOLD_ID } from "./dev";
import {
  type Account,
  type Transaction,
  type TransactionStatus,
  type TransactionType,
  cashBalance,
  creditCardAvailable,
  creditCardOutstanding,
} from "./finance";

// =========================================================================
// Row shapes
// =========================================================================

interface AccountRow {
  id: string;
  owner_member_id: string | null;
  name: string;
  type: "debit" | "cash" | "credit";
  opening_balance: string;
  credit_limit: string | null;
  currency: string;
  is_active: boolean;
  external_identifier: string | null;
}

interface MemberRow {
  id: string;
  display_name: string;
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

// =========================================================================
// View model
// =========================================================================

export interface AccountSummary {
  id: string;
  name: string;
  type: "debit" | "cash" | "credit";
  ownerMemberId: string | null; // for edit-form prefill; null = joint
  ownerName: string | null; // null = joint
  currency: string;
  openingBalance: number;
  // Last-4 digits (or similar) used by Gmail parsers to match an incoming
  // transaction notification to this account. Null for cash accounts.
  externalIdentifier: string | null;
  isActive: boolean;

  // Debit / cash only
  balance?: number;

  // Credit only
  outstanding?: number;
  available?: number;
  limit?: number;
  utilizationPercent?: number; // 0-100
}

// =========================================================================
// Helpers
// =========================================================================

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

function toSummary(
  r: AccountRow,
  ownerName: string | null,
  transactions: Transaction[],
): AccountSummary {
  const finance: Account = {
    id: r.id,
    type: r.type,
    openingBalance: Number(r.opening_balance),
    creditLimit: r.credit_limit ? Number(r.credit_limit) : undefined,
    currency: r.currency,
  };

  const common = {
    id: r.id,
    name: r.name,
    type: r.type,
    ownerMemberId: r.owner_member_id,
    ownerName,
    currency: r.currency,
    openingBalance: Number(r.opening_balance),
    externalIdentifier: r.external_identifier,
    isActive: r.is_active,
  } as const;

  if (r.type === "credit") {
    const outstanding = creditCardOutstanding(finance, transactions);
    const limit = Number(r.credit_limit);
    const available = creditCardAvailable(finance, transactions);
    return {
      ...common,
      type: r.type,
      outstanding,
      available,
      limit,
      utilizationPercent:
        limit > 0
          ? Math.max(0, Math.min(100, Math.round((outstanding / limit) * 100)))
          : 0,
    };
  }

  return {
    ...common,
    type: r.type,
    balance: cashBalance(finance, transactions),
  };
}

// =========================================================================
// Queries
// =========================================================================

export async function listAccounts(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<AccountSummary[]> {
  const [accountRows, memberRows, txRows] = await Promise.all([
    sql<AccountRow[]>`
      select id, owner_member_id, name, type, opening_balance, credit_limit, currency, is_active, external_identifier
      from accounts
      where household_id = ${householdId}
      order by case type when 'debit' then 1 when 'cash' then 2 when 'credit' then 3 end, name
    `,
    sql<MemberRow[]>`
      select id, display_name from household_members
      where household_id = ${householdId}
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

  const memberById = new Map(memberRows.map((m) => [m.id, m.display_name]));
  const transactions = txRows.map(rowToTransaction);

  return accountRows.map((r) =>
    toSummary(r, r.owner_member_id ? memberById.get(r.owner_member_id) ?? null : null, transactions),
  );
}

export async function getAccount(
  id: string,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<AccountSummary | null> {
  const [accountRow] = await sql<AccountRow[]>`
    select id, owner_member_id, name, type, opening_balance, credit_limit, currency, is_active, external_identifier
    from accounts
    where household_id = ${householdId} and id = ${id}
  `;
  if (!accountRow) return null;

  const [memberRows, txRows] = await Promise.all([
    accountRow.owner_member_id
      ? sql<MemberRow[]>`
          select id, display_name from household_members
          where id = ${accountRow.owner_member_id}
        `
      : Promise.resolve([] as MemberRow[]),
    sql<TxRow[]>`
      select id, type, status, amount, transaction_date,
             account_id, counter_account_id, category_id,
             fund_id, counter_fund_id, refund_of_transaction_id,
             merchant, note
      from transactions
      where household_id = ${householdId}
    `,
  ]);

  const ownerName = memberRows[0]?.display_name ?? null;
  const transactions = txRows.map(rowToTransaction);
  return toSummary(accountRow, ownerName, transactions);
}
