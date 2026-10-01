import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRightIcon, WalletIcon } from "@/components/ui/icons";
import type { BudgetSummary } from "@/lib/dashboard-data";
import { formatRupiah } from "@/lib/format";

export function BudgetHero({
  budget,
  periodLabel,
}: {
  budget: BudgetSummary;
  periodLabel: string;
}) {
  const tone =
    budget.percentUsed >= 100
      ? "danger"
      : budget.percentUsed >= 80
        ? "warm"
        : "accent";

  const pillTone = tone === "accent" ? "accent" : "warm";
  const remainingColor =
    tone === "danger"
      ? "text-[color:var(--danger)]"
      : tone === "warm"
        ? "text-[color:var(--warm-fg)]"
        : "text-accent-strong";

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs tracking-wide text-muted uppercase">
            Monthly budget · {periodLabel}
          </p>
          <p className="mt-2 text-[40px] leading-none font-semibold tracking-tight">
            {formatRupiah(budget.totalBudget)}
          </p>
        </div>
        <Pill tone={pillTone}>
          <WalletIcon className="h-3.5 w-3.5" />
          {budget.percentUsed}% used
        </Pill>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-strong">
        Spent {formatRupiah(budget.totalSpent)} so far with{" "}
        <span className={`font-medium ${remainingColor}`}>
          {formatRupiah(budget.remaining)}
        </span>{" "}
        left to budget this month.
      </p>

      <div className="mt-5 rounded-2xl bg-surface-tint p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Budget vs spent</span>
          <span className="font-medium text-muted-strong tabular-nums">
            {formatRupiah(budget.totalSpent)} /{" "}
            {formatRupiah(budget.totalBudget)}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={budget.percentUsed} tone={tone} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          Budget remaining is not the same as cash in your accounts.
        </p>
        <Link
          href="/budgets"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-tint px-3 py-1 text-[11px] font-medium text-muted-strong"
        >
          Open budgets <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
