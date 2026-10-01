import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import { createTransferAction } from "@/app/transactions/actions";
import type { AccountOption } from "@/lib/transactions-data";

// Transfers deliberately expose NO category/fund fields. Movement between
// accounts is not spending — see docs/financial-logic.md §6 and
// src/lib/finance/transactions.ts::createTransfer.
export function TransferForm({
  accounts,
  defaultDate,
}: {
  accounts: AccountOption[];
  defaultDate: string;
}) {
  // Transfers are between debit/cash accounts. (Moving money to a credit
  // card is a credit_card_payment, not a transfer.)
  const transferAccounts = accounts.filter((a) => a.type !== "credit");

  return (
    <Card className="p-5">
      <form action={createTransferAction} className="flex flex-col gap-4">
        <FormField label="From account" htmlFor="fromAccountId">
          <select
            id="fromAccountId"
            name="fromAccountId"
            required
            defaultValue=""
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
            defaultValue=""
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
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            required
            placeholder="0"
            className={inputClass}
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
          <textarea id="note" name="note" className={textareaClass} />
        </FormField>

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
          >
            Save transfer
          </button>
          <Link
            href="/transactions"
            className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  );
}
