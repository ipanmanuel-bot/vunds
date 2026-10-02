// Factory functions for each transaction type.
//
// Each factory returns a well-shaped `Transaction` and enforces the per-type
// invariants from docs/financial-logic.md (same invariants the DB CHECK
// constraint enforces in db/migrations/*_initial_schema.sql).

import type { Transaction, TransactionStatus } from "./types";

interface Common {
  id: string;
  amount: number;
  transactionDate: Date;
  status?: TransactionStatus;
  note?: string;
}

function assertPositive(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive finite number");
  }
}

export interface IncomeInput extends Common {
  accountId: string;
  categoryId: string;
}

export function createIncome(input: IncomeInput): Transaction {
  assertPositive(input.amount);
  return {
    id: input.id,
    type: "income",
    status: input.status ?? "confirmed",
    amount: input.amount,
    transactionDate: input.transactionDate,
    accountId: input.accountId,
    categoryId: input.categoryId,
    note: input.note,
  };
}

export interface ExpenseInput extends Common {
  accountId: string;
  categoryId: string;
  fundId?: string;
  merchant?: string;
}

export function createExpense(input: ExpenseInput): Transaction {
  assertPositive(input.amount);
  return {
    id: input.id,
    type: "expense",
    status: input.status ?? "confirmed",
    amount: input.amount,
    transactionDate: input.transactionDate,
    accountId: input.accountId,
    categoryId: input.categoryId,
    fundId: input.fundId,
    merchant: input.merchant,
    note: input.note,
  };
}

// A credit card purchase is semantically an expense with a credit account.
// The dedicated name documents caller intent; the DB CHECK is identical to
// an expense (credit card accounts can legally be the account_id on expenses).
export function createCreditCardPurchase(input: ExpenseInput): Transaction {
  return createExpense(input);
}

export interface TransferInput extends Common {
  fromAccountId: string;
  toAccountId: string;
}

export function createTransfer(input: TransferInput): Transaction {
  assertPositive(input.amount);
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("transfer source and destination accounts must differ");
  }
  return {
    id: input.id,
    type: "transfer",
    status: input.status ?? "confirmed",
    amount: input.amount,
    transactionDate: input.transactionDate,
    accountId: input.fromAccountId,
    counterAccountId: input.toAccountId,
    note: input.note,
  };
}

export interface CreditCardPaymentInput extends Common {
  fromAccountId: string;
  creditCardAccountId: string;
}

export function createCreditCardPayment(
  input: CreditCardPaymentInput,
): Transaction {
  assertPositive(input.amount);
  if (input.fromAccountId === input.creditCardAccountId) {
    throw new Error("credit card payment source and target must differ");
  }
  return {
    id: input.id,
    type: "credit_card_payment",
    status: input.status ?? "confirmed",
    amount: input.amount,
    transactionDate: input.transactionDate,
    accountId: input.fromAccountId,
    counterAccountId: input.creditCardAccountId,
    note: input.note,
  };
}

export interface FundAllocationInput extends Common {
  // Movement between virtual fund buckets. Either side may be omitted if the
  // allocation is from/to the implicit "unallocated" pool, but at least one
  // fund must be named.
  fromFundId?: string;
  toFundId?: string;
}

export function createFundAllocation(input: FundAllocationInput): Transaction {
  assertPositive(input.amount);
  if (!input.fromFundId && !input.toFundId) {
    throw new Error(
      "fund allocation requires at least a source or destination fund",
    );
  }
  if (
    input.fromFundId &&
    input.toFundId &&
    input.fromFundId === input.toFundId
  ) {
    throw new Error("fund allocation source and destination must differ");
  }
  return {
    id: input.id,
    type: "fund_allocation",
    status: input.status ?? "confirmed",
    amount: input.amount,
    transactionDate: input.transactionDate,
    fundId: input.fromFundId,
    counterFundId: input.toFundId,
    note: input.note,
  };
}

export interface RefundInput extends Common {
  // Account that received the refunded money back.
  accountId: string;
  refundOfTransactionId: string;
  // Typically mirrors the original expense's category so refund-month
  // reporting can net against the correct category.
  categoryId?: string;
}

export function createRefund(input: RefundInput): Transaction {
  assertPositive(input.amount);
  return {
    id: input.id,
    type: "refund",
    status: input.status ?? "confirmed",
    amount: input.amount,
    transactionDate: input.transactionDate,
    accountId: input.accountId,
    refundOfTransactionId: input.refundOfTransactionId,
    categoryId: input.categoryId,
    note: input.note,
  };
}

// =========================================================================
// Balance adjustment — reconciliation when the account's actual balance
// (from the bank) diverges from Vunds' computed one.
//
// Direction is in the type so we keep the amount > 0 invariant:
//   increase → balance went UP (debit gets more cash, credit outstanding
//              grew — you owe more)
//   decrease → balance went DOWN (debit lost cash, credit outstanding
//              dropped — you owe less)
//
// Adjustments change account balances but DO NOT count toward monthly
// expense, income, budgets, or fund accounting.
// =========================================================================

export interface AdjustmentInput extends Common {
  accountId: string;
  direction: "increase" | "decrease";
}

export function createAdjustment(input: AdjustmentInput): Transaction {
  assertPositive(input.amount);
  return {
    id: input.id,
    type:
      input.direction === "increase"
        ? "adjustment_increase"
        : "adjustment_decrease",
    status: input.status ?? "confirmed",
    amount: input.amount,
    transactionDate: input.transactionDate,
    accountId: input.accountId,
    note: input.note,
  };
}

export interface PendingImportInput {
  id: string;
  amount: number;
  accountId: string;
  transactionDate: Date;
  source: "gmail";
  sourceMessageId: string;
  // Optional — unknown-merchant imports leave this undefined for user review.
  categoryId?: string;
  merchant?: string;
}

// A provisional import that the user must review. Enters `pending` and is
// excluded from all confirmed-only reports. The user confirms (promoting to
// `confirmed`), edits, or rejects it from the Money Inbox.
export function createPendingImport(input: PendingImportInput): Transaction {
  assertPositive(input.amount);
  return {
    id: input.id,
    type: "expense",
    status: "pending",
    amount: input.amount,
    transactionDate: input.transactionDate,
    accountId: input.accountId,
    categoryId: input.categoryId,
    merchant: input.merchant,
    source: input.source,
    sourceMessageId: input.sourceMessageId,
  };
}
