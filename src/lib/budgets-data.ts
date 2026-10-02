import { buildChildrenMap, getDescendantIds } from "./categories";
import { sql } from "./db";
import { DEV_HOUSEHOLD_ID } from "./dev";
import {
  type Transaction,
  type TransactionStatus,
  type TransactionType,
  budgetRemaining,
  monthlyExpense,
} from "./finance";

// =========================================================================
// Row shapes
// =========================================================================

interface BudgetRow {
  id: string;
  category_id: string;
  period_year: number;
  period_month: number;
  amount: string;
  currency: string;
}

interface CategoryRow {
  id: string;
  parent_id: string | null;
  name: string;
  parent_name: string | null;
  kind: "income" | "expense";
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
// View models
// =========================================================================

export interface BudgetLine {
  // Row key = categoryId. Not every line has a `budgets` row backing it
  // (unbudgeted categories still appear in the list, with amount=0).
  categoryId: string;
  categoryName: string;
  categoryParentName: string | null;
  amount: number;         // 0 means "no budget set"
  spent: number;          // from monthlyExpense (fund-attached excluded)
  remaining: number;      // amount − spent; negative when over
  percentUsed: number;    // 0 when amount==0
  currency: string;
  hasBudget: boolean;     // amount > 0
}

export interface BudgetPeriod {
  year: number;
  month: number;
  lines: BudgetLine[];
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalPercentUsed: number;
}

export interface PeriodOption {
  year: number;
  month: number;
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

// =========================================================================
// Queries
// =========================================================================

export async function getBudget(
  year: number,
  month: number,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<BudgetPeriod> {
  const [budgetRows, categoryRows, txRows] = await Promise.all([
    sql<BudgetRow[]>`
      select id, category_id, period_year, period_month, amount, currency
      from budgets
      where household_id = ${householdId}
        and period_year = ${year}
        and period_month = ${month}
    `,
    // All categories — we need the full tree for descendant rollup, even if
    // we only emit top-level rows below.
    sql<CategoryRow[]>`
      select c.id, c.parent_id, c.name, c.kind, p.name as parent_name
      from categories c
      left join categories p on p.id = c.parent_id
      where c.household_id = ${householdId}
        and c.is_archived = false
      order by coalesce(p.sort_order, c.sort_order), c.sort_order, c.name
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

  const childrenMap = buildChildrenMap(
    categoryRows.map((c) => ({ id: c.id, parentId: c.parent_id })),
  );
  const transactions = txRows.map(rowToTransaction);

  // Iterate every non-archived expense top-level category. Join with the
  // sparse budgets table — missing rows mean "amount = 0" (not budgeted).
  const budgetByCategory = new Map(
    budgetRows.map((b) => [b.category_id, Number(b.amount)]),
  );

  const topExpenseCategories = categoryRows.filter(
    (c) => c.parent_id == null && c.kind === "expense",
  );

  const lines: BudgetLine[] = topExpenseCategories.map((cat) => {
    const amount = budgetByCategory.get(cat.id) ?? 0;
    const descendantIds = getDescendantIds(childrenMap, cat.id);
    // Compute spent directly from monthlyExpense (the envelope-rule exclusion
    // of fund-attached expenses lives inside this function). budgetRemaining
    // would also work but we need `spent` for the UI either way.
    const spent = monthlyExpense(year, month, transactions, {
      categoryIds: descendantIds,
    });
    const remaining = amount - spent;
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryParentName: cat.parent_name,
      amount,
      spent,
      remaining,
      percentUsed: amount > 0 ? Math.round((spent / amount) * 100) : 0,
      currency: "IDR",
      hasBudget: amount > 0,
    };
  });

  const totalBudget = lines.reduce((s, l) => s + l.amount, 0);
  const totalSpent = lines.reduce((s, l) => s + l.spent, 0);

  // Keep the reference so the import is used (even in the simplified path
  // where we moved to monthlyExpense directly).
  void budgetRemaining;

  return {
    year,
    month,
    lines,
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    totalPercentUsed:
      totalBudget > 0
        ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
        : 0,
  };
}

// Returns distinct (year, month) tuples that have any budget rows, newest
// first. Used to populate the period picker.
export async function listBudgetPeriods(
  householdId = DEV_HOUSEHOLD_ID,
): Promise<PeriodOption[]> {
  const rows = await sql<{ period_year: number; period_month: number }[]>`
    select distinct period_year, period_month
    from budgets
    where household_id = ${householdId}
    order by period_year desc, period_month desc
  `;
  return rows.map((r) => ({ year: r.period_year, month: r.period_month }));
}

// Expose the raw monthlyExpense helper by returning the household's total
// confirmed expense for a period. The budgets page shows this alongside the
// per-category breakdown so the user can see uncategorised spend if any.
export async function totalMonthExpense(
  year: number,
  month: number,
  householdId = DEV_HOUSEHOLD_ID,
): Promise<number> {
  const txRows = await sql<TxRow[]>`
    select id, type, status, amount, transaction_date,
           account_id, counter_account_id, category_id,
           fund_id, counter_fund_id, refund_of_transaction_id,
           merchant, note
    from transactions
    where household_id = ${householdId}
  `;
  return monthlyExpense(year, month, txRows.map(rowToTransaction));
}
