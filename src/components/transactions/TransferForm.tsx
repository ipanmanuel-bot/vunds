import Link from "next/link";

import { createTransferAction } from "@/app/transactions/actions";
import { AmountInput } from "@/components/ui/AmountInput";
import { Card } from "@/components/ui/Card";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/FormField";
import type { AccountOption } from "@/lib/transactions-data";

export interface TransferDefaults {
  amount?: number;
  fromAccountId?: string;
  toAccountId?: string;
  note?: string;
}

// Transfers deliberately expose NO category/fund fields. Movement between
// accounts is not spending — see docs/financial-logic.md §6 and
// src/lib/finance/transactions.ts::createTransfer.
export function TransferForm({
  accounts,
  defaultDate,
  defaults,
  action = createTransferAction,
  transactionId,
  submitLabel = "Save transfer",
  cancelHref = "/transactions",
  extraPendingSlot,
}: {
  accounts: AccountOption[];
  defaultDate: string;
  defaults?: TransferDefaults;
  action?: (fd: FormData) => Promise<void>;
  transactionId?: string;
  submitLabel?: string;
  cancelHref?: string;
  extraPendingSlot?: React.ReactNode;
}) {
  // Transfers are between debit/cash accounts. (Moving money to a credit
  // card is a credit_card_payment, not a transfer.)
  const transferAccounts = accounts.filter((a) => a.type !== "credit");

  return (
    <Card className="p-5">
      <form action={action} className="flex flex-col gap-4">
        {transactionId ? (
          <input type="hidden" name="transactionId" value={transactionId} />
        ) : null}

        <FormField label="From account" htmlFor="fromAccountId">
          <select
            id="fromAccountId"
            name="fromAccountId"
            required
            defaultValue={defaults?.fromAccountId ?? ""}
            className={selectClass}
          >
            <option value="" disabled>
              Select source
            </option>
            {transferAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="To account" htmlFor="toAccountId">
          <select
            id="toAccountId"
            name="toAccountId"
            required
            defaultValue={defaults?.toAccountId ?? ""}
            className={selectClass}
          >
            <option value="" disabled>
              Select destination
            </option>
            {transferAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Amount (IDR)" htmlFor="amount">
          <AmountInput
            id="amount"
            name="amount"
            required
            defaultValue={defaults?.amount ?? ""}
          />
        </FormField>

        <FormField label="Date" htmlFor="transactionDate">
          <input
            id="transactionDate"
            name="transactionDate"
            type="date"
            required
            defaultValue={defaultDate}
            className={inputClass}
          />
        </FormField>

        <FormField label="Note (optional)" htmlFor="note">
          <textarea
            id="note"
            name="note"
            defaultValue={defaults?.note ?? ""}
            className={textareaClass}
          />
        </FormField>

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
          >
            {submitLabel}
          </button>
          <Link
            href={cancelHref}
            className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
          >
            Cancel
          </Link>
        </div>
      </form>

      {extraPendingSlot}
    </Card>
  );
}
