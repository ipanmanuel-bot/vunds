// Critical-invariant tests from CLAUDE.md.
//
// These cover the properties the spec marks as non-negotiable, plus factory
// guards and status/month filtering edges that make the core safe to build on.

import { describe, expect, it } from "vitest";

import {
  type Account,
  budgetRemaining,
  cashBalance,
  createCreditCardPayment,
  createCreditCardPurchase,
  createExpense,
  createFundAllocation,
  createIncome,
  createRefund,
  createTransfer,
  creditCardAvailable,
  creditCardOutstanding,
  fundAllocated,
  isDuplicateMessage,
  monthlyExpense,
  monthlyIncome,
} from "./index";

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const SEP = { year: 2026, month: 9 };

const bca = (openingBalance: number): Account => ({
  id: "bca",
  type: "debit",
  openingBalance,
});

const cc = (openingOutstanding = 0, limit = 15_000_000): Account => ({
  id: "cc",
  type: "credit",
  openingBalance: openingOutstanding,
  creditLimit: limit,
});

// =========================================================================
// No double counting
// =========================================================================

describe("No double counting", () => {
  it("transfers do not inflate income or expense totals", () => {
    const from: Account = { id: "a", type: "debit", openingBalance: 10_000_000 };
    const to: Account = { id: "b", type: "debit", openingBalance: 0 };
    const txs = [
      createTransfer({
        id: "tr",
        amount: 1_000_000,
        fromAccountId: from.id,
        toAccountId: to.id,
        transactionDate: date("2026-09-10"),
      }),
    ];

    // Sum of both account balances must equal sum of opening balances —
    // money neither created nor destroyed.
    expect(cashBalance(from, txs) + cashBalance(to, txs)).toBe(10_000_000);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
  });

  it("credit card purchase + CC payment net to the right place with no expense inflation", () => {
    const bank = bca(5_000_000);
    const card = cc();
    const purchase = createCreditCardPurchase({
      id: "p",
      amount: 200_000,
      accountId: card.id,
      categoryId: "food-dining",
      transactionDate: date("2026-09-01"),
    });
    const payment = createCreditCardPayment({
      id: "pay",
      amount: 200_000,
      fromAccountId: bank.id,
      creditCardAccountId: card.id,
      transactionDate: date("2026-09-20"),
    });
    const txs = [purchase, payment];

    // After paying the card off, bank is down by 200K, CC outstanding is 0,
    // and monthly expense reflects ONLY the purchase (not the payment).
    expect(cashBalance(bank, txs)).toBe(4_800_000);
    expect(creditCardOutstanding(card, txs)).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(200_000);
  });
});

// =========================================================================
// Credit card payments are never expenses
// =========================================================================

describe("Credit card payments are never expenses", () => {
  it("paying a CC does not appear in monthlyExpense or monthlyIncome", () => {
    const bank = bca(5_000_000);
    const card = cc(5_000_000);
    const txs = [
      createCreditCardPayment({
        id: "p",
        amount: 1_000_000,
        fromAccountId: bank.id,
        creditCardAccountId: card.id,
        transactionDate: date("2026-09-25"),
      }),
    ];
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
  });

  it("CC payment reduces outstanding by exactly the paid amount", () => {
    const card = cc(1_000_000);
    const txs = [
      createCreditCardPayment({
        id: "p",
        amount: 400_000,
        fromAccountId: "bank",
        creditCardAccountId: card.id,
        transactionDate: date("2026-09-25"),
      }),
    ];
    expect(creditCardOutstanding(card, txs)).toBe(600_000);
  });
});

// =========================================================================
// Transfers are never income or expenses
// =========================================================================

describe("Transfers are never income or expenses", () => {
  it("exclusion holds across many transfers in a month", () => {
    const a: Account = { id: "a", type: "debit", openingBalance: 50_000_000 };
    const b: Account = { id: "b", type: "debit", openingBalance: 0 };
    const txs = Array.from({ length: 5 }, (_, i) =>
      createTransfer({
        id: `t${i}`,
        amount: 1_000_000,
        fromAccountId: a.id,
        toAccountId: b.id,
        transactionDate: date(`2026-09-0${i + 1}`),
      }),
    );
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
    expect(cashBalance(a, txs)).toBe(45_000_000);
    expect(cashBalance(b, txs)).toBe(5_000_000);
  });
});

// =========================================================================
// Fund allocations are never expenses
// =========================================================================

describe("Fund allocations are never expenses", () => {
  it("moving money between funds does not touch bank balances or expense totals", () => {
    const bank = bca(10_000_000);
    const txs = [
      createFundAllocation({
        id: "fa",
        amount: 2_000_000,
        fromFundId: "general",
        toFundId: "vacation",
        transactionDate: date("2026-09-10"),
      }),
    ];
    expect(cashBalance(bank, txs)).toBe(10_000_000);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
    expect(fundAllocated("general", txs)).toBe(-2_000_000);
    expect(fundAllocated("vacation", txs)).toBe(2_000_000);
  });
});

// =========================================================================
// Refunds reduce net expense (not income)
// =========================================================================

describe("Refunds reduce net expense (not income)", () => {
  it("a refund larger than the original expense makes net expense negative, never positive income", () => {
    const account = bca(1_000_000);
    const original = createExpense({
      id: "exp",
      amount: 100_000,
      accountId: account.id,
      categoryId: "shopping",
      transactionDate: date("2026-09-01"),
    });
    const bigRefund = createRefund({
      id: "ref",
      amount: 250_000,
      accountId: account.id,
      refundOfTransactionId: original.id,
      categoryId: "shopping",
      transactionDate: date("2026-09-15"),
    });
    const txs = [original, bigRefund];

    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(-150_000);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
  });
});

// =========================================================================
// Opening balances are not income
// =========================================================================

describe("Opening balances are not income", () => {
  it("accounts with large opening balances report zero monthly income/expense when no transactions exist", () => {
    const bank = bca(100_000_000);
    expect(cashBalance(bank, [])).toBe(100_000_000);
    expect(monthlyIncome(SEP.year, SEP.month, [])).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, [])).toBe(0);
  });

  it("credit card with opening outstanding reports zero income/expense", () => {
    const card = cc(2_000_000);
    expect(creditCardOutstanding(card, [])).toBe(2_000_000);
    expect(monthlyIncome(SEP.year, SEP.month, [])).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, [])).toBe(0);
  });
});

// =========================================================================
// Status filtering
// =========================================================================

describe("Status filtering", () => {
  it("pending, rejected, and reversed transactions are excluded from reports and balances", () => {
    const account = bca(1_000_000);
    const base = {
      amount: 100_000,
      accountId: account.id,
      categoryId: "food",
      transactionDate: date("2026-09-10"),
    };
    const txs = [
      createExpense({ ...base, id: "pending", status: "pending" }),
      createExpense({ ...base, id: "rejected", status: "rejected" }),
      createExpense({ ...base, id: "reversed", status: "reversed" }),
    ];
    expect(cashBalance(account, txs)).toBe(1_000_000);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
  });
});

// =========================================================================
// Month filtering
// =========================================================================

describe("Month filtering", () => {
  it("expenses in other months do not count toward the selected month", () => {
    const account = bca(10_000_000);
    const txs = [
      createExpense({
        id: "aug",
        amount: 100_000,
        accountId: account.id,
        categoryId: "food",
        transactionDate: date("2026-08-31"),
      }),
      createExpense({
        id: "sep",
        amount: 200_000,
        accountId: account.id,
        categoryId: "food",
        transactionDate: date("2026-09-01"),
      }),
      createExpense({
        id: "oct",
        amount: 400_000,
        accountId: account.id,
        categoryId: "food",
        transactionDate: date("2026-10-01"),
      }),
    ];
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(200_000);
    // Balance is unaffected by month filter.
    expect(cashBalance(account, txs)).toBe(9_300_000);
  });
});

// =========================================================================
// Budget
// =========================================================================

describe("Budget remaining", () => {
  it("subtracts only confirmed expenses in the budget's category and month", () => {
    const account = bca(10_000_000);
    const txs = [
      createExpense({
        id: "a",
        amount: 1_500_000,
        accountId: account.id,
        categoryId: "food-dining",
        transactionDate: date("2026-09-02"),
      }),
      createExpense({
        id: "b",
        amount: 500_000,
        accountId: account.id,
        categoryId: "food-dining",
        transactionDate: date("2026-09-20"),
      }),
      createExpense({
        id: "other",
        amount: 1_000_000,
        accountId: account.id,
        categoryId: "transport-fuel",
        transactionDate: date("2026-09-10"),
      }),
    ];
    const remaining = budgetRemaining(
      {
        amount: 4_000_000,
        year: 2026,
        month: 9,
        categoryIds: new Set(["food-dining"]),
      },
      txs,
    );
    expect(remaining).toBe(2_000_000);
  });

  it("refunds in the budget's category and month increase the remaining budget", () => {
    const account = bca(10_000_000);
    const exp = createExpense({
      id: "e",
      amount: 500_000,
      accountId: account.id,
      categoryId: "food-dining",
      transactionDate: date("2026-09-02"),
    });
    const ref = createRefund({
      id: "r",
      amount: 200_000,
      accountId: account.id,
      refundOfTransactionId: exp.id,
      categoryId: "food-dining",
      transactionDate: date("2026-09-05"),
    });
    const remaining = budgetRemaining(
      {
        amount: 1_000_000,
        year: 2026,
        month: 9,
        categoryIds: new Set(["food-dining"]),
      },
      [exp, ref],
    );
    expect(remaining).toBe(700_000);
  });
});

// =========================================================================
// Credit card available
// =========================================================================

describe("Credit card available", () => {
  it("equals limit minus outstanding", () => {
    const card = cc(0, 15_000_000);
    const txs = [
      createCreditCardPurchase({
        id: "p",
        amount: 4_500_000,
        accountId: card.id,
        categoryId: "shopping",
        transactionDate: date("2026-09-01"),
      }),
    ];
    expect(creditCardOutstanding(card, txs)).toBe(4_500_000);
    expect(creditCardAvailable(card, txs)).toBe(10_500_000);
  });
});

// =========================================================================
// Factory guards
// =========================================================================

describe("Factory guards", () => {
  it("rejects non-positive amounts", () => {
    expect(() =>
      createExpense({
        id: "e",
        amount: 0,
        accountId: "a",
        categoryId: "c",
        transactionDate: new Date(),
      }),
    ).toThrow();
    expect(() =>
      createIncome({
        id: "i",
        amount: -1,
        accountId: "a",
        categoryId: "c",
        transactionDate: new Date(),
      }),
    ).toThrow();
  });

  it("rejects same-account transfers and CC payments", () => {
    expect(() =>
      createTransfer({
        id: "x",
        amount: 1,
        fromAccountId: "a",
        toAccountId: "a",
        transactionDate: new Date(),
      }),
    ).toThrow();
    expect(() =>
      createCreditCardPayment({
        id: "x",
        amount: 1,
        fromAccountId: "a",
        creditCardAccountId: "a",
        transactionDate: new Date(),
      }),
    ).toThrow();
  });

  it("rejects fund allocation with no funds and with matching source/destination", () => {
    expect(() =>
      createFundAllocation({
        id: "x",
        amount: 1,
        transactionDate: new Date(),
      }),
    ).toThrow();
    expect(() =>
      createFundAllocation({
        id: "x",
        amount: 1,
        fromFundId: "same",
        toFundId: "same",
        transactionDate: new Date(),
      }),
    ).toThrow();
  });
});

// =========================================================================
// Dedup
// =========================================================================

describe("Dedup", () => {
  it("same source+message is duplicate", () => {
    const existing = [{ source: "gmail", sourceMessageId: "x" }];
    expect(
      isDuplicateMessage(
        { source: "gmail", sourceMessageId: "x" },
        existing,
      ),
    ).toBe(true);
  });

  it("same message id across different sources is not a duplicate", () => {
    const existing = [{ source: "gmail", sourceMessageId: "x" }];
    expect(
      isDuplicateMessage(
        { source: "manual", sourceMessageId: "x" },
        existing,
      ),
    ).toBe(false);
  });
});

// =========================================================================
// Envelope / sinking-fund rule (docs/financial-logic.md §8, §13)
// =========================================================================

describe("Fund-attached expenses are excluded from monthly expense", () => {
  it("a regular expense counts; the same expense with a fund does NOT", () => {
    const account = bca(10_000_000);
    const regular = createExpense({
      id: "e1",
      amount: 500_000,
      accountId: account.id,
      categoryId: "food-dining",
      transactionDate: date("2026-09-10"),
    });
    const fundSpend = createExpense({
      id: "e2",
      amount: 3_000_000,
      accountId: account.id,
      categoryId: "wedding-venue",
      fundId: "wedding",
      transactionDate: date("2026-09-11"),
    });

    expect(monthlyExpense(SEP.year, SEP.month, [regular, fundSpend])).toBe(
      500_000,
    );
  });

  it("budget remaining ignores fund-attached expenses too", () => {
    const account = bca(10_000_000);
    const txs = [
      createExpense({
        id: "e",
        amount: 3_000_000,
        accountId: account.id,
        categoryId: "wedding-venue",
        fundId: "wedding",
        transactionDate: date("2026-09-11"),
      }),
    ];
    const remaining = budgetRemaining(
      {
        amount: 5_000_000,
        year: 2026,
        month: 9,
        categoryIds: new Set(["wedding-venue"]),
      },
      txs,
    );
    // Monthly budget untouched by fund-attached spend.
    expect(remaining).toBe(5_000_000);
  });

  it("a refund of a fund-attached expense is also excluded from monthly expense", () => {
    const account = bca(10_000_000);
    const original = createExpense({
      id: "e",
      amount: 1_000_000,
      accountId: account.id,
      categoryId: "wedding-catering",
      fundId: "wedding",
      transactionDate: date("2026-09-01"),
    });
    const refund = createRefund({
      id: "r",
      amount: 200_000,
      accountId: account.id,
      refundOfTransactionId: original.id,
      categoryId: "wedding-catering",
      transactionDate: date("2026-09-05"),
    });
    expect(monthlyExpense(SEP.year, SEP.month, [original, refund])).toBe(0);
  });

  it("cashBalance still reflects the fund-attached spend (real money left)", () => {
    const account = bca(10_000_000);
    const txs = [
      createExpense({
        id: "e",
        amount: 3_000_000,
        accountId: account.id,
        categoryId: "wedding-venue",
        fundId: "wedding",
        transactionDate: date("2026-09-11"),
      }),
    ];
    expect(cashBalance(account, txs)).toBe(7_000_000);
  });
});

// =========================================================================
// Balance adjustments (reconciliation)
// =========================================================================

import { createAdjustment } from "./transactions";

describe("Balance adjustments", () => {
  it("adjustment_increase adds to debit cashBalance", () => {
    const account = bca(5_000_000);
    const adj = createAdjustment({
      id: "a1",
      amount: 100_000,
      direction: "increase",
      accountId: account.id,
      transactionDate: date("2026-09-10"),
    });
    expect(cashBalance(account, [adj])).toBe(5_100_000);
  });

  it("adjustment_decrease subtracts from debit cashBalance", () => {
    const account = bca(5_000_000);
    const adj = createAdjustment({
      id: "a1",
      amount: 100_000,
      direction: "decrease",
      accountId: account.id,
      transactionDate: date("2026-09-10"),
    });
    expect(cashBalance(account, [adj])).toBe(4_900_000);
  });

  it("adjustment_increase on a credit account grows outstanding", () => {
    const card = cc(500_000);
    const adj = createAdjustment({
      id: "a1",
      amount: 50_000,
      direction: "increase",
      accountId: card.id,
      transactionDate: date("2026-09-10"),
    });
    expect(creditCardOutstanding(card, [adj])).toBe(550_000);
  });

  it("adjustment_decrease on a credit account shrinks outstanding", () => {
    const card = cc(500_000);
    const adj = createAdjustment({
      id: "a1",
      amount: 50_000,
      direction: "decrease",
      accountId: card.id,
      transactionDate: date("2026-09-10"),
    });
    expect(creditCardOutstanding(card, [adj])).toBe(450_000);
  });

  it("adjustments do NOT appear in monthlyExpense or monthlyIncome", () => {
    const account = bca(5_000_000);
    const incAdj = createAdjustment({
      id: "a1",
      amount: 1_000_000,
      direction: "increase",
      accountId: account.id,
      transactionDate: date("2026-09-10"),
    });
    const decAdj = createAdjustment({
      id: "a2",
      amount: 500_000,
      direction: "decrease",
      accountId: account.id,
      transactionDate: date("2026-09-15"),
    });
    expect(monthlyIncome(SEP.year, SEP.month, [incAdj, decAdj])).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, [incAdj, decAdj])).toBe(0);
  });

  it("factory rejects non-positive amount", () => {
    expect(() =>
      createAdjustment({
        id: "a",
        amount: 0,
        direction: "increase",
        accountId: "x",
        transactionDate: new Date(),
      }),
    ).toThrow();
  });
});
