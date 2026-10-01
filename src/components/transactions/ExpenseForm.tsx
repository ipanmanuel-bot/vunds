import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import { createExpenseAction } from "@/app/transactions/actions";
import type {
  AccountOption,
  CategoryOption,
  FundOption,
} from "@/lib/transactions-data";

export function ExpenseForm({
  accounts,
  categories,
  funds,
  defaultDate,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  funds: FundOption[];
  defaultDate: string;
}) {
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  return (
    <Card className="p-5">
      <form action={createExpenseAction} className="flex flex-col gap-4">
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

        <FormField label="From account" htmlFor="accountId">
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
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Category" htmlFor="categoryId">
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
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentName ? `${c.parentName} · ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Fund (optional)"
          htmlFor="fundId"
          hint="Attach this expense to a goal — purely informational, does not move money between funds."
        >
          <select id="fundId" name="fundId" defaultValue="" className={selectClass}>
            <option value="">None</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
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

        <FormField label="Merchant (optional)" htmlFor="merchant">
          <input
            id="merchant"
            name="merchant"
            type="text"
            placeholder="e.g. Ranch Market"
            className={inputClass}
          />
        </FormField>

        <FormField label="Note (optional)" htmlFor="note">
          <textarea id="note" name="note" className={textareaClass} />
        </FormField>

        <SubmitBar label="Save expense" />
      </form>
    </Card>
  );
}

function SubmitBar({ label }: { label: string }) {
  return (
    <div className="mt-2 flex gap-2">
      <button
        type="submit"
        className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
      >
        {label}
      </button>
      <Link
        href="/transactions"
        className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
      >
        Cancel
      </Link>
    </div>
  );
}
