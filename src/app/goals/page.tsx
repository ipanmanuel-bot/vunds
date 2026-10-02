import Link from "next/link";

import { FundSummaryCard } from "@/components/funds/FundSummaryCard";
import { Card } from "@/components/ui/Card";
import { listAccounts } from "@/lib/accounts-data";
import { formatRupiah } from "@/lib/format";
import { listFunds } from "@/lib/funds-data";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [funds, accounts] = await Promise.all([listFunds(), listAccounts()]);

  // "Available to allocate" = cash in hand that isn't already earmarked.
  //
  // Fund allocation doesn't touch bank balances (per docs/financial-logic.md
  // §Fund Allocation), so cash minus "still-in-pocket" tells you how much is
  // free to assign to goals. Using fund.remaining (allocated − spent) rather
  // than fund.allocated means spending from a fund restores capacity
  // (both the bank balance and the fund's remaining drop by the same
  // amount, cancelling out — exactly what you want for "what's still
  // unassigned").
  const totalCashable = accounts
    .filter((a) => a.type === "debit" || a.type === "cash")
    .reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const totalEarmarked = funds.reduce((sum, f) => sum + Math.max(0, f.remaining), 0);
  const available = totalCashable - totalEarmarked;

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
          <Card className="p-5">
            <p className="text-xs tracking-wide text-muted uppercase">
              Available to allocate
            </p>
            <p
              className={`mt-1 text-[32px] leading-none font-semibold tracking-tight tabular-nums ${
                available < 0
                  ? "text-[color:var(--danger)]"
                  : "text-foreground"
              }`}
            >
              {available < 0 ? "−" : ""}
              {formatRupiah(Math.abs(available))}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-tint p-3">
                <p className="text-[11px] text-muted">Debit + Cash</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatRupiah(totalCashable)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-tint p-3">
                <p className="text-[11px] text-muted">In fund pockets</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatRupiah(totalEarmarked)}
                </p>
              </div>
            </div>
            {available < 0 ? (
              <p className="mt-3 text-[11px] text-[color:var(--danger)]">
                You&apos;ve allocated more to funds than you have in cash.
                Spend some from the funds or lower an allocation.
              </p>
            ) : null}
          </Card>

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
