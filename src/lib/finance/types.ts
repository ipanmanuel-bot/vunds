// Core financial-domain types.
//
// Mirrors the semantics in docs/financial-logic.md. These types are pure data;
// they carry no DB coupling and no I/O. Amounts are expressed in the account's
// currency as decimal numbers (JS `number`). For IDR this is whole rupiah;
// for currencies with sub-units, callers can use two decimal places.

export type AccountType = "debit" | "cash" | "credit";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "credit_card_payment"
  | "fund_allocation"
  | "refund";

export type TransactionStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "reversed"
  | "refunded";

export type ImportSource = "manual" | "gmail";

export interface Account {
  id: string;
  type: AccountType;
  // For debit/cash: starting cash. For credit: starting outstanding liability.
  openingBalance: number;
  // Credit cards only.
  creditLimit?: number;
  currency?: string;
}

// account_id / counter_account_id convention — matches db/migrations CHECK:
//   income   | expense | refund        -> account_id set,   counter NULL
//   transfer | credit_card_payment     -> account_id = FROM, counter = TO
//   fund_allocation                    -> both NULL
export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  transactionDate: Date;
  accountId?: string;
  counterAccountId?: string;
  categoryId?: string;
  fundId?: string;
  counterFundId?: string;
  refundOfTransactionId?: string;
  source?: ImportSource;
  sourceMessageId?: string;
  merchant?: string;
  note?: string;
}
