import { AutosaveBudgetAmount } from "@/components/budgets/AutosaveBudgetAmount";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { BudgetLine } from "@/lib/budgets-data";
import { formatRupiah } from "@/lib/format";

export function BudgetRow({
  line,
  year,
  month,
}: {
  line: BudgetLine;
  year: number;
  month: number;
}) {
  const overBudget = line.remaining < 0;
  const tone = overBudget
    ? "danger"
    : line.percentUsed >= 80
      ? "warm"
      : "accent";
  const remainingLabel = overBudget
    ? `${formatRupiah(Math.abs(line.remaining))} over`
    : `${formatRupiah(line.remaining)} left`;
  const remainingColor = overBudget
    ? "text-[color:var(--danger)]"
    : line.percentUsed >= 80
      ? "text-[color:var(--warm-fg)]"
      : "text-accent-strong";

  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      {/* Row header: category name on the left, autosaving amount on the right */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{line.categoryName}</p>
        <AutosaveBudgetAmount
          categoryId={line.categoryId}
          year={year}
          month={month}
          initialAmount={line.amount}
        />
      </div>

      {line.hasBudget ? (
        <>
          <ProgressBar percent={Math.min(100, line.percentUsed)} tone={tone} />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted tabular-nums">
              {formatRupiah(line.spent)} spent · {line.percentUsed}%
            </span>
            <span className={`font-medium tabular-nums ${remainingColor}`}>
              {remainingLabel}
            </span>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-muted">
          Not budgeted{line.spent > 0 ? ` · ${formatRupiah(line.spent)} spent so far` : ""}
        </p>
      )}
    </li>
  );
}
