import { buildChildrenMap, getDescendantIds } from "./categories";
import { sql } from "./db";
import { DEV_HOUSEHOLD_ID, DEV_PERIOD } from "./dev";
import {
  type Account,
  type Transaction,
  type TransactionStatus,
  type TransactionType,
  budgetRemaining,
  cashBalance,
  creditCardAvailable,
  creditCardOutstanding,
  fundAllocated,
  fundSpent,
  monthlyExpense,
  monthlyIncome,
} from "./finance";

// =========================================================================
// Row shapes (match db/migrations schema)
// =========================================================================

interface AccountRow {
  id: string;
  owner_member_id: string | null;
  name: string;
  type: "debit" | "cash" | "credit";
  opening_balance: string;
  credit_limit: string | null;
  currency: string;
}

interface MemberRow {
  id: string;
  display_name: string;
}

interface CategoryRow {
  id: string;
  parent_id: string | null;
  name: string;
  kind: "income" | "expense";
}

interface FundRow {
  id: string;
  name: string;
  target_amount: string | null;
  currency: string;
}

interface BudgetRow {
  category_id: string;
  period_year: number;
  period_month: number;
  amount: string;
}

interface TxRow {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  transaction_date: string; // YYYY-MM-DD
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
// View models (what the components consume)
// =========================================================================

export interface AccountView {
  id: string;
  name: string;
  type: "debit" | "cash" | "credit";
  ownerName: string | null; // null = joint
  currency: string;
  // debit/cash
  balance?: number;
  // credit
  outstanding?: number;
  available?: number;
  limit?: number;
}

export interface FundView {
  id: string;
  name: string;
  targetAmount: number | null;
  allocated: number;
  spent: number;
  currency: string;
}

export interface TransactionView {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  date: Date;
  merchant: string | null;
  categoryName: string | null;
  categoryParent: string | null;
  accountName: string | null;
  counterAccountName: string | null;
  note: string | null;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number; // 0-100
}

export interface SpendingBar {
  year: number;
  month: number; // 1-12
  amount: number;
  isCurrent: boolean;
}

export interface DashboardData {
  period: { year: number; month: number };
  viewer: { displayName: string };
  budget: BudgetSummary;
  spendingComparison: SpendingBar[];
  accounts: AccountView[];
  funds: FundView[];
  recentTransactions: TransactionView[];
  pendingCount: number;
}

// =========================================================================
// Loader
// =========================================================================

export async function loadDashboard(
  period = DEV_PERIOD,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<DashboardData> {
  const [
    accountRows,
    memberRows,
    categoryRows,
    fundRows,
    budgetRows,
    txRows,
    pendingRows,
  ] = await Promise.all([
    sql<AccountRow[]>`
      select id, owner_member_id, name, type,
             opening_balance, credit_limit, currency
      from accounts
      where household_id = ${householdId}
      order by name
    `,
    sql<MemberRow[]>`
      select id, display_name
      from household_members
      where household_id = ${householdId}
    `,
    sql<CategoryRow[]>`
      select id, parent_id, name, kind
      from categories
      where household_id = ${householdId}
    `,
    sql<FundRow[]>`
      select id, name, target_amount, currency
      from funds
      where household_id = ${householdId}
      order by name
    `,
    sql<BudgetRow[]>`
      select category_id, period_year, period_month, amount
      from budgets
      where household_id = ${householdId}
        and period_year = ${period.year}
        and period_month = ${period.month}
    `,
    sql<TxRow[]>`
      select id, type, status, amount, transaction_date,
             account_id, counter_account_id, category_id,
             fund_id, counter_fund_id, refund_of_transaction_id,
             merchant, note
      from transactions
      where household_id = ${householdId}
      order by transaction_date desc, created_at desc
    `,
    sql<{ count: string }[]>`
      select count(*)::text as count
      from transactions
      where household_id = ${householdId} and status = 'pending'
    `,
  ]);

  // ---- Lookups ----
  const memberById = new Map(memberRows.map((m) => [m.id, m]));
  const accountById = new Map(accountRows.map((a) => [a.id, a]));
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

  // ---- Transactions in finance-lib shape ----
  const transactions: Transaction[] = txRows.map((r) => ({
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
  }));

  // ---- Accounts ----
  const accounts: AccountView[] = accountRows.map((r) => {
    const financeAcc: Account = {
      id: r.id,
      type: r.type,
      openingBalance: Number(r.opening_balance),
      creditLimit: r.credit_limit ? Number(r.credit_limit) : undefined,
      currency: r.currency,
    };
    const ownerName = r.owner_member_id
      ? (memberById.get(r.owner_member_id)?.display_name ?? null)
      : null;

    if (r.type === "credit") {
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        ownerName,
        currency: r.currency,
        outstanding: creditCardOutstanding(financeAcc, transactions),
        available: creditCardAvailable(financeAcc, transactions),
        limit: Number(r.credit_limit),
      };
    }

    return {
      id: r.id,
      name: r.name,
      type: r.type,
      ownerName,
      currency: r.currency,
      balance: cashBalance(financeAcc, transactions),
    };
  });

  // ---- Funds ----
  const funds: FundView[] = fundRows.map((r) => ({
    id: r.id,
    name: r.name,
    targetAmount: r.target_amount ? Number(r.target_amount) : null,
    allocated: fundAllocated(r.id, transactions),
    spent: fundSpent(r.id, transactions),
    currency: r.currency,
  }));

  // ---- Budget summary ----
  // Sum of per-category budgets for the period. Each budget's "remaining" is
  // computed against the budget's category tree (parent + descendants).
  const childrenMap = buildChildrenMap(
    categoryRows.map((c) => ({ id: c.id, parentId: c.parent_id })),
  );

  let totalBudget = 0;
  let totalSpent = 0;
  for (const b of budgetRows) {
    const amount = Number(b.amount);
    totalBudget += amount;
    const categoryIds = getDescendantIds(childrenMap, b.category_id);
    const remaining = budgetRemaining(
      {
        amount,
        year: b.period_year,
        month: b.period_month,
        categoryIds,
      },
      transactions,
    );
    totalSpent += amount - remaining;
  }

  const budget: BudgetSummary = {
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    percentUsed:
      totalBudget > 0
        ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
        : 0,
  };

  // ---- Spending comparison: 4 months ending at `period` ----
  const spendingComparison: SpendingBar[] = [];
  for (let i = 3; i >= 0; i--) {
    let y = period.year;
    let m = period.month - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    spendingComparison.push({
      year: y,
      month: m,
      amount: monthlyExpense(y, m, transactions),
      isCurrent: y === period.year && m === period.month,
    });
  }

  // ---- Recent transactions (top 6 confirmed, newest first) ----
  const recentTransactions: TransactionView[] = transactions
    .filter((t) => t.status === "confirmed")
    .slice(0, 6)
    .map((t) => {
      const cat = t.categoryId ? categoryById.get(t.categoryId) : undefined;
      const parent =
        cat?.parent_id ? categoryById.get(cat.parent_id) : undefined;
      return {
        id: t.id,
        type: t.type,
        status: t.status,
        amount: t.amount,
        date: t.transactionDate,
        merchant: t.merchant ?? null,
        categoryName: cat?.name ?? null,
        categoryParent: parent?.name ?? null,
        accountName: t.accountId
          ? (accountById.get(t.accountId)?.name ?? null)
          : null,
        counterAccountName: t.counterAccountId
          ? (accountById.get(t.counterAccountId)?.name ?? null)
          : null,
        note: t.note ?? null,
      };
    });

  // Also surface totals for the hero / spending section.
  void monthlyIncome; // reserved for future use

  return {
    period,
    viewer: { displayName: "Ivan" },
    budget,
    spendingComparison,
    accounts,
    funds,
    recentTransactions,
    pendingCount: Number(pendingRows[0]?.count ?? 0),
  };
}
