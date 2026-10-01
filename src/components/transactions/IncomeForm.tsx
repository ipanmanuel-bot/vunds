import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import { createIncomeAction } from "@/app/transactions/actions";
import type { AccountOption, CategoryOption } from "@/lib/transactions-data";

export function IncomeForm({
  accounts,
  categories,
  defaultDate,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  defaultDate: string;
}) {
  // Only debit/cash accounts are sensible destinations for income.
  const destinationAccounts = accounts.filter((a) => a.type !== "credit");
  const incomeCategories = categories.filter((c) => c.kind === "income");

  return (
    <Card className="p-5">
      <form action={createIncomeAction} className="flex flex-col gap-4">
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

        <FormField label="To account" htmlFor="accountId">
          <select
            id="accountId"
            name="accountId"
            required
            defaultValue=""
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
            defaultValue=""
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
          <textarea id="note" name="note" className={textareaClass} />
        </FormField>

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
          >
            Save income
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
