import Link from "next/link";

import { FundSummaryCard } from "@/components/funds/FundSummaryCard";
import { listFunds } from "@/lib/funds-data";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const funds = await listFunds();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="flex items-start justify-between pt-6">
          <div>
            <p className="text-xs text-muted">Household finance</p>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
              Goals
            </h1>
            <p className="mt-1 text-xs text-muted">
              Funds are virtual allocations — they describe what money is
              intended for, not where it physically lives.
            </p>
          </div>
          <Link
            href="/goals/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background"
          >
            <span className="text-lg leading-none">+</span>
            New
          </Link>
        </header>

        <main className="mt-5 flex flex-col gap-3">
          {funds.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-surface p-8 text-center shadow-[0_1px_2px_rgba(15,42,31,0.04),0_8px_24px_-12px_rgba(15,42,31,0.08)]">
              <p className="text-sm text-muted">No funds yet.</p>
              <Link
                href="/goals/new"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
              >
                Add your first fund
              </Link>
            </div>
          ) : (
            funds.map((f) => <FundSummaryCard key={f.id} fund={f} />)
          )}
        </main>
      </div>
    </div>
  );
}
