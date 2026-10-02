import Link from "next/link";

import { createIncomeAction } from "@/app/transactions/actions";
import { AmountInput } from "@/components/ui/AmountInput";
import { Card } from "@/components/ui/Card";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/FormField";
import type { AccountOption, CategoryOption } from "@/lib/transactions-data";

export interface IncomeDefaults {
  amount?: number;
  accountId?: string;
  categoryId?: string;
  note?: string;
}

export function IncomeForm({
  accounts,
  categories,
  defaultDate,
  defaults,
  action = createIncomeAction,
  transactionId,
  submitLabel = "Save income",
  cancelHref = "/transactions",
  extraPendingSlot,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  defaultDate: string;
  defaults?: IncomeDefaults;
  action?: (fd: FormData) => Promise<void>;
  transactionId?: string;
  submitLabel?: string;
  cancelHref?: string;
  extraPendingSlot?: React.ReactNode;
}) {
  const destinationAccounts = accounts.filter((a) => a.type !== "credit");
  const incomeCategories = categories.filter((c) => c.kind === "income");

  return (
    <Card className="p-5">
      <form action={action} className="flex flex-col gap-4">
        {transactionId ? (
          <input type="hidden" name="transactionId" value={transactionId} />
        ) : null}

        <FormField label="Amount (IDR)" htmlFor="amount">
          <AmountInput
            id="amount"
            name="amount"
            required
            defaultValue={defaults?.amount ?? ""}
          />
        </FormField>

        <FormField label="To account" htmlFor="accountId">
          <select
            id="accountId"
            name="accountId"
            required
            defaultValue={defaults?.accountId ?? ""}
            className={selectClass}
          >
            <option value="" disabled>
              Select account
            </option>
            {destinationAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Income category" htmlFor="categoryId">
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={defaults?.categoryId ?? ""}
            className={selectClass}
          >
            <option value="" disabled>
              Select category
            </option>
            {incomeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentName ? `${c.parentName} · ${c.name}` : c.name}
              </option>
            ))}
          </select>
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
