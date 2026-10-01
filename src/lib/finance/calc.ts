// Pure calculation functions.
//
// All functions here are deterministic and depend only on their inputs. No
// I/O, no `now()`, no mutation. Only `status === "confirmed"` transactions
// are counted — pending / rejected / reversed are excluded. Opening balances
// are account properties, never transactions, so they never affect income or
// expense totals (per docs/financial-logic.md §10 and §13).

import type { Account, Transaction } from "./types";

const isConfirmed = (t: Transaction): boolean => t.status === "confirmed";

// 1-indexed month to match human expectation (September = 9).
const inMonth = (d: Date, year: number, month: number): boolean =>
  d.getUTCFullYear() === year && d.getUTCMonth() === month - 1;

// =========================================================================
// Account balance
// =========================================================================

export function cashBalance(
  account: Account,
  transactions: Transaction[],
): number {
  if (account.type === "credit") {
    throw new Error(
      "cashBalance is for debit/cash accounts; use creditCardOutstanding for credit",
    );
  }
  let balance = account.openingBalance;
  for (const t of transactions) {
    if (!isConfirmed(t)) continue;
    switch (t.type) {
      case "income":
        if (t.accountId === account.id) balance += t.amount;
        break;
      case "expense":
        if (t.accountId === account.id) balance -= t.amount;
        break;
      case "transfer":
      case "credit_card_payment":
        if (t.accountId === account.id) balance -= t.amount;
        else if (t.counterAccountId === account.id) balance += t.amount;
        break;
      case "refund":
        if (t.accountId === account.id) balance += t.amount;
        break;
      case "fund_allocation":
        // Virtual: never touches a bank balance.
        break;
    }
  }
  return balance;
}

export function creditCardOutstanding(
  account: Account,
  transactions: Transaction[],
): number {
  if (account.type !== "credit") {
    throw new Error("creditCardOutstanding requires a credit account");
  }
  let outstanding = account.openingBalance;
  for (const t of transactions) {
    if (!isConfirmed(t)) continue;
    switch (t.type) {
      case "expense":
        // Credit card purchase = expense whose account is the credit card.
        if (t.accountId === account.id) outstanding += t.amount;
        break;
      case "credit_card_payment":
        // Payment reduces liability on the counter (CC) side.
        if (t.counterAccountId === account.id) outstanding -= t.amount;
        break;
      case "refund":
        // Refund to a credit account reduces liability.
        if (t.accountId === account.id) outstanding -= t.amount;
        break;
      default:
        break;
    }
  }
  return outstanding;
}

export function creditCardAvailable(
  account: Account,
  transactions: Transaction[],
): number {
  if (account.creditLimit == null) {
    throw new Error("creditCardAvailable requires an account with creditLimit");
  }
  return account.creditLimit - creditCardOutstanding(account, transactions);
}

// =========================================================================
// Monthly reporting
// =========================================================================

export interface MonthlyExpenseOptions {
  // Restrict to transactions whose categoryId is in this set. Caller is
  // responsible for subcategory rollup (pass all descendant category IDs).
  categoryIds?: Set<string>;
}

export function monthlyExpense(
  year: number,
  month: number,
  transactions: Transaction[],
  options: MonthlyExpenseOptions = {},
): number {
  const want = options.categoryIds;
  let total = 0;
  for (const t of transactions) {
    if (!isConfirmed(t)) continue;
    if (!inMonth(t.transactionDate, year, month)) continue;

    if (t.type === "expense") {
      if (want && (!t.categoryId || !want.has(t.categoryId))) continue;
      total += t.amount;
    } else if (t.type === "refund") {
      if (want && (!t.categoryId || !want.has(t.categoryId))) continue;
      total -= t.amount;
    }
    // transfer / credit_card_payment / fund_allocation / income never count.
  }
  return total;
}

export function monthlyIncome(
  year: number,
  month: number,
  transactions: Transaction[],
): number {
  let total = 0;
  for (const t of transactions) {
    if (!isConfirmed(t)) continue;
    if (!inMonth(t.transactionDate, year, month)) continue;
    if (t.type === "income") total += t.amount;
    // Refunds, transfers, fund allocations, CC payments are NOT income.
  }
  return total;
}

// =========================================================================
// Budget
// =========================================================================

export interface BudgetSpec {
  categoryIds: Set<string>;
  amount: number;
  year: number;
  month: number;
}

export function budgetRemaining(
  budget: BudgetSpec,
  transactions: Transaction[],
): number {
  const spent = monthlyExpense(budget.year, budget.month, transactions, {
    categoryIds: budget.categoryIds,
  });
  return budget.amount - spent;
}

// =========================================================================
// Funds
// =========================================================================

// Net amount currently allocated to a fund via fund_allocation movements.
// Positive = money flowed in; negative = money flowed out.
export function fundAllocated(
  fundId: string,
  transactions: Transaction[],
): number {
  let total = 0;
  for (const t of transactions) {
    if (!isConfirmed(t)) continue;
    if (t.type !== "fund_allocation") continue;
    if (t.counterFundId === fundId) total += t.amount;
    if (t.fundId === fundId) total -= t.amount;
  }
  return total;
}

// Expenses tagged to a fund, net of refunds that trace back to those expenses.
export function fundSpent(
  fundId: string,
  transactions: Transaction[],
): number {
  const byId = new Map(transactions.map((t) => [t.id, t] as const));
  let total = 0;
  for (const t of transactions) {
    if (!isConfirmed(t)) continue;
    if (t.type === "expense" && t.fundId === fundId) {
      total += t.amount;
    } else if (t.type === "refund" && t.refundOfTransactionId) {
      const original = byId.get(t.refundOfTransactionId);
      if (original?.fundId === fundId) total -= t.amount;
    }
  }
  return total;
}
