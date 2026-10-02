import Link from "next/link";

import { FilterBar } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { currentPeriod } from "@/lib/dev";
import { getFormOptions, listTransactions } from "@/lib/transactions-data";
import { parseFilter } from "@/lib/transactions-filter";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = parseFilter(sp, currentPeriod());

  const [items, options] = await Promise.all([
    listTransactions(filter),
    getFormOptions(),
  ]);

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="flex items-center justify-between pt-6">
          <div>
            <p className="text-xs text-muted">Household finance</p>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
              Transactions
            </h1>
          </div>
          <Link
            href="/transactions/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background"
          >
            <span className="text-lg leading-none">+</span>
            New
          </Link>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <FilterBar
            filter={filter}
            accounts={options.accounts}
            categories={options.categories}
            members={options.members}
          />
          <TransactionList items={items} />
        </main>
      </div>
    </div>
  );
}
