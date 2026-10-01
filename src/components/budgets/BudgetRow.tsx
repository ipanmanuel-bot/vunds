import { ProgressBar } from "@/components/ui/ProgressBar";
import type { BudgetLine } from "@/lib/budgets-data";
import { formatRupiah } from "@/lib/format";

export function BudgetRow({ line }: { line: BudgetLine }) {
  const overBudget = line.remaining < 0;
  const tone = overBudget ? "danger" : line.percentUsed >= 80 ? "warm" : "accent";
  const remainingLabel = overBudget
    ? `${formatRupiah(Math.abs(line.remaining))} over`
    : `${formatRupiah(line.remaining)} left`;
  const remainingColor = overBudget
    ? "text-[color:var(--danger)]"
    : line.percentUsed >= 80
      ? "text-[color:var(--warm-fg)]"
      : "text-accent-strong";

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">{line.categoryName}</p>
          {line.categoryParentName &&
          line.categoryParentName !== line.categoryName ? (
            <p className="text-[11px] text-muted">{line.categoryParentName}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {formatRupiah(line.spent)}
          </p>
          <p className="text-[11px] text-muted tabular-nums">
            of {formatRupiah(line.amount)}
          </p>
        </div>
      </div>
      <ProgressBar percent={Math.min(100, line.percentUsed)} tone={tone} />
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted tabular-nums">{line.percentUsed}% used</span>
        <span className={`font-medium tabular-nums ${remainingColor}`}>
          {remainingLabel}
        </span>
      </div>
    </li>
  );
}
