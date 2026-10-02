import Link from "next/link";

import { createExpenseAction } from "@/app/transactions/actions";
import { AmountInput } from "@/components/ui/AmountInput";
import { Card } from "@/components/ui/Card";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/FormField";
import type {
  AccountOption,
  CategoryOption,
  FundOption,
} from "@/lib/transactions-data";

export interface ExpenseDefaults {
  amount?: number;
  accountId?: string;
  categoryId?: string;
  fundId?: string;
  merchant?: string;
  note?: string;
}

export function ExpenseForm({
  accounts,
  categories,
  funds,
  defaultDate,
  defaults,
  action = createExpenseAction,
  transactionId,
  submitLabel = "Save expense",
  cancelHref = "/transactions",
  extraPendingSlot,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  funds: FundOption[];
  defaultDate: string;
  defaults?: ExpenseDefaults;
  action?: (fd: FormData) => Promise<void>;
  transactionId?: string;
  submitLabel?: string;
  cancelHref?: string;
  /** Rendered inside the <form> below the Save button — used by the detail
   *  page to add a Reject button that posts to a different action. */
  extraPendingSlot?: React.ReactNode;
}) {
  const expenseCategories = categories.filter((c) => c.kind === "expense");

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

        <FormField label="From account" htmlFor="accountId">
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
            defaultValue={defaults?.categoryId ?? ""}
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
          hint="If you set a fund, this expense draws from that fund's pocket and does NOT count toward your monthly budget. Real cash still leaves the account."
        >
          <select
            id="fundId"
            name="fundId"
            defaultValue={defaults?.fundId ?? ""}
            className={selectClass}
          >
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
            defaultValue={defaults?.merchant ?? ""}
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
