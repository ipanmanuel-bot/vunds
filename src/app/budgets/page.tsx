import Link from "next/link";

import { BudgetRow } from "@/components/budgets/BudgetRow";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRightIcon } from "@/components/ui/icons";
import { DEV_PERIOD } from "@/lib/dev";
import {
  getBudget,
  listBudgetPeriods,
  totalMonthExpense,
} from "@/lib/budgets-data";
import { formatRupiah, monthName } from "@/lib/format";

export const dynamic = "force-dynamic";

function parsePeriod(
  raw: string | undefined,
): { year: number; month: number } | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) return null;
  return { year: y, month: mo };
}

function toKey({ year, month }: { year: number; month: number }): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.period) ? sp.period[0] : sp.period;
  const period = parsePeriod(raw) ?? DEV_PERIOD;

  const [budget, periods, monthExpenseTotal] = await Promise.all([
    getBudget(period.year, period.month),
    listBudgetPeriods(),
    totalMonthExpense(period.year, period.month),
  ]);

  const periodLabel = `${monthName(period.month)} ${period.year}`;
  const headerTone =
    budget.totalPercentUsed >= 100
      ? "warm"
      : budget.totalPercentUsed >= 80
        ? "warm"
        : "accent";
  const remainingClass =
    budget.totalRemaining < 0
      ? "text-[color:var(--danger)]"
      : "text-accent-strong";

  // Spending that didn't fall under any budgeted category tree — surfaced
  // alongside the budget total so the user can see uncategorised spend.
  const uncategorisedSpend = Math.max(0, monthExpenseTotal - budget.totalSpent);

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Home
          </Link>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">
            Budgets
          </h1>
          <p className="mt-1 text-xs text-muted">
            Planned spending per category. Only confirmed transactions count.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <Card className="p-4">
            <form method="GET" action="/budgets" className="flex items-center gap-2">
              <label htmlFor="period" className="text-xs text-muted">
                Period
              </label>
              <select
                id="period"
                name="period"
                defaultValue={toKey(period)}
                className="flex-1 appearance-none rounded-xl bg-surface px-3 py-2 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
              >
                {periods.length === 0 ? (
                  <option value={toKey(period)}>{periodLabel}</option>
                ) : (
                  periods.map((p) => (
                    <option key={toKey(p)} value={toKey(p)}>
                      {monthName(p.month)} {p.year}
                    </option>
                  ))
                )}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background"
              >
                Go
              </button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs tracking-wide text-muted uppercase">
                  Total budget · {periodLabel}
                </p>
                <p className="mt-2 text-[36px] leading-none font-semibold tracking-tight tabular-nums">
                  {formatRupiah(budget.totalBudget)}
                </p>
              </div>
              <Pill tone={headerTone === "accent" ? "accent" : "warm"}>
                {budget.totalPercentUsed}% used
              </Pill>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-strong">
              Spent {formatRupiah(budget.totalSpent)} ·{" "}
              <span className={`font-medium ${remainingClass}`}>
                {budget.totalRemaining < 0
                  ? `${formatRupiah(Math.abs(budget.totalRemaining))} over`
                  : `${formatRupiah(budget.totalRemaining)} left`}
              </span>
            </p>

            <div className="mt-4 rounded-2xl bg-surface-tint p-4">
              <ProgressBar
                percent={budget.totalPercentUsed}
                tone={budget.totalRemaining < 0 ? "danger" : headerTone}
              />
            </div>

            {uncategorisedSpend > 0 ? (
              <p className="mt-3 text-[11px] text-muted">
                Plus{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatRupiah(uncategorisedSpend)}
                </span>{" "}
                spent on categories without a budget this month.
              </p>
            ) : null}

            <p className="mt-3 text-[11px] text-muted">
              Budget remaining is not the same as cash in your accounts.
            </p>
          </Card>

          <Card className="p-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <h2 className="text-sm font-semibold">By category</h2>
              <Link
                href="/categories"
                className="inline-flex items-center gap-1 text-[11px] text-accent-strong"
              >
                Customize categories <ArrowRightIcon className="h-3 w-3" />
              </Link>
            </div>
            {budget.lines.length === 0 ? (
              <p className="text-sm text-muted">
                No budgets set for {periodLabel}.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {budget.lines.map((line) => (
                  <BudgetRow key={line.id} line={line} />
                ))}
              </ul>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
