// Acceptance tests from docs/financial-logic.md §16.
//
// Each test mirrors an acceptance test in the spec. If the spec changes,
// update these tests in lock-step.

import { describe, expect, it } from "vitest";

import {
  type Account,
  cashBalance,
  createCreditCardPayment,
  createCreditCardPurchase,
  createExpense,
  createFundAllocation,
  createIncome,
  createPendingImport,
  createRefund,
  createTransfer,
  creditCardOutstanding,
  fundAllocated,
  fundSpent,
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

describe("Acceptance (docs/financial-logic.md §16)", () => {
  it("Test 1 — Salary", () => {
    const account = bca(0);
    const txs = [
      createIncome({
        id: "t1",
        amount: 20_000_000,
        accountId: account.id,
        categoryId: "salary",
        transactionDate: date("2026-09-01"),
      }),
    ];

    expect(cashBalance(account, txs)).toBe(20_000_000);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(20_000_000);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
  });

  it("Test 2 — Debit expense", () => {
    const account = bca(1_000_000);
    const txs = [
      createExpense({
        id: "t2",
        amount: 100_000,
        accountId: account.id,
        categoryId: "food-dining",
        transactionDate: date("2026-09-02"),
      }),
    ];

    expect(cashBalance(account, txs)).toBe(900_000);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(100_000);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
  });

  it("Test 3 — Credit card expense (cash unchanged, CC outstanding up)", () => {
    const bank = bca(5_000_000);
    const card = cc();
    const txs = [
      createCreditCardPurchase({
        id: "t3",
        amount: 100_000,
        accountId: card.id,
        categoryId: "food-dining",
        transactionDate: date("2026-09-03"),
      }),
    ];

    expect(creditCardOutstanding(card, txs)).toBe(100_000);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(100_000);
    expect(cashBalance(bank, txs)).toBe(5_000_000); // unchanged
  });

  it("Test 4 — CC payment (not an expense)", () => {
    const bank = bca(1_000_000);
    const card = cc(100_000);
    const txs = [
      createCreditCardPayment({
        id: "t4",
        amount: 100_000,
        fromAccountId: bank.id,
        creditCardAccountId: card.id,
        transactionDate: date("2026-09-10"),
      }),
    ];

    expect(cashBalance(bank, txs)).toBe(900_000);
    expect(creditCardOutstanding(card, txs)).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
  });

  it("Test 5 — Transfer between accounts (not income/expense)", () => {
    const ivan: Account = {
      id: "bca-ivan",
      type: "debit",
      openingBalance: 10_000_000,
    };
    const vero: Account = {
      id: "bca-vero",
      type: "debit",
      openingBalance: 0,
    };
    const txs = [
      createTransfer({
        id: "t5",
        amount: 5_000_000,
        fromAccountId: ivan.id,
        toAccountId: vero.id,
        transactionDate: date("2026-09-05"),
      }),
    ];

    expect(cashBalance(ivan, txs)).toBe(5_000_000);
    expect(cashBalance(vero, txs)).toBe(5_000_000);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
  });

  it("Test 6 — Fund allocation (virtual; no bank/income/expense change)", () => {
    const bank = bca(20_000_000);
    const txs = [
      createFundAllocation({
        id: "t6",
        amount: 5_000_000,
        fromFundId: "general",
        toFundId: "wedding",
        transactionDate: date("2026-09-06"),
      }),
    ];

    expect(fundAllocated("general", txs)).toBe(-5_000_000);
    expect(fundAllocated("wedding", txs)).toBe(5_000_000);
    expect(cashBalance(bank, txs)).toBe(20_000_000);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(0);
  });

  it("Test 7 — Wedding expense (expense attached to fund)", () => {
    const bank = bca(10_000_000);
    const txs = [
      createExpense({
        id: "t7",
        amount: 3_000_000,
        accountId: bank.id,
        categoryId: "wedding-venue",
        fundId: "wedding",
        transactionDate: date("2026-09-07"),
      }),
    ];

    expect(cashBalance(bank, txs)).toBe(7_000_000);
    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(3_000_000);
    expect(fundSpent("wedding", txs)).toBe(3_000_000);
  });

  it("Test 8 — Duplicate Gmail email → exactly one transaction", () => {
    const existing = [
      { source: "gmail", sourceMessageId: "gmail-abc123" },
    ];
    expect(
      isDuplicateMessage(
        { source: "gmail", sourceMessageId: "gmail-abc123" },
        existing,
      ),
    ).toBe(true);
    expect(
      isDuplicateMessage(
        { source: "gmail", sourceMessageId: "gmail-different" },
        existing,
      ),
    ).toBe(false);
  });

  it("Test 9 — Unknown merchant stays reviewable (pending, no fabricated category)", () => {
    const account = bca(1_000_000);
    const pending = createPendingImport({
      id: "t9",
      amount: 85_000,
      accountId: account.id,
      transactionDate: date("2026-09-09"),
      source: "gmail",
      sourceMessageId: "gmail-unknown-1",
      // deliberately no categoryId — parser could not categorize
    });

    expect(pending.status).toBe("pending");
    expect(pending.categoryId).toBeUndefined();
    // Pending transactions must not appear in confirmed-expense reporting.
    expect(monthlyExpense(SEP.year, SEP.month, [pending])).toBe(0);
    // And they must not alter cash balance until confirmed.
    expect(cashBalance(account, [pending])).toBe(1_000_000);
  });

  it("Test 10 — Refund reduces net expense, is not income", () => {
    const account = bca(2_000_000);
    const original = createExpense({
      id: "t10-exp",
      amount: 500_000,
      accountId: account.id,
      categoryId: "shopping-clothing",
      transactionDate: date("2026-09-10"),
    });
    const refund = createRefund({
      id: "t10-ref",
      amount: 100_000,
      accountId: account.id,
      refundOfTransactionId: original.id,
      categoryId: "shopping-clothing",
      transactionDate: date("2026-09-15"),
    });
    const txs = [original, refund];

    expect(monthlyExpense(SEP.year, SEP.month, txs)).toBe(400_000);
    expect(monthlyIncome(SEP.year, SEP.month, txs)).toBe(0);
    expect(cashBalance(account, txs)).toBe(1_600_000);
  });

  it("Test 11 — Opening balance is not income or expense", () => {
    const account = bca(10_000_000);

    expect(cashBalance(account, [])).toBe(10_000_000);
    expect(monthlyIncome(SEP.year, SEP.month, [])).toBe(0);
    expect(monthlyExpense(SEP.year, SEP.month, [])).toBe(0);
  });
});
