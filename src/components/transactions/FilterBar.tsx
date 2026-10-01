import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { FormField, selectClass, inputClass } from "@/components/ui/FormField";
import type {
  AccountOption,
  CategoryOption,
  MemberOption,
} from "@/lib/transactions-data";
import type { TransactionFilter } from "@/lib/transactions-filter";

// Native GET form — submitting navigates to /transactions with new params.
// No client-side JS needed to drive filters.
export function FilterBar({
  filter,
  accounts,
  categories,
  members,
}: {
  filter: TransactionFilter;
  accounts: AccountOption[];
  categories: CategoryOption[];
  members: MemberOption[];
}) {
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  return (
    <Card className="p-4">
      <form method="GET" action="/transactions" className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="From" htmlFor="from">
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={filter.from}
              className={inputClass}
            />
          </FormField>
          <FormField label="To" htmlFor="to">
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={filter.to}
              className={inputClass}
            />
          </FormField>
        </div>

        <FormField label="Account" htmlFor="accountId">
          <select
            id="accountId"
            name="accountId"
            defaultValue={filter.accountId ?? "all"}
            className={selectClass}
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Category" htmlFor="categoryId">
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={filter.categoryId ?? "all"}
            className={selectClass}
          >
            <option value="all">All categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentName ? `${c.parentName} · ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Owner"
          htmlFor="memberId"
          hint="Transactions touching the selected member's accounts (joint included). Fund allocations are hidden when a member is selected."
        >
          <select
            id="memberId"
            name="memberId"
            defaultValue={filter.memberId ?? "all"}
            className={selectClass}
          >
            <option value="all">Whole household</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
          >
            Apply
          </button>
          <Link
            href="/transactions"
            className="rounded-xl bg-surface-tint px-4 py-3 text-sm font-medium text-muted-strong"
          >
            Reset
          </Link>
        </div>
      </form>
    </Card>
  );
}
