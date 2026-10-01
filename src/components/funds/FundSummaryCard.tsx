import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { FundSummary } from "@/lib/funds-data";
import { formatRupiah } from "@/lib/format";

export function FundSummaryCard({ fund }: { fund: FundSummary }) {
  return (
    <Link href={`/goals/${fund.id}`} className="block rounded-[var(--radius-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <Card className="p-5 transition-transform active:scale-[0.995]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium">{fund.name}</p>
            <p className="mt-1 text-xs text-muted">Virtual allocation</p>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-muted" />
        </div>

        <div className="mt-4">
          <p className="text-[11px] text-muted">Allocated</p>
          <p className="text-[22px] leading-none font-semibold tracking-tight tabular-nums">
            {formatRupiah(fund.allocated)}
          </p>
        </div>

        {fund.targetAmount != null ? (
          <div className="mt-4">
            <ProgressBar percent={fund.progressPercent ?? 0} />
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
              <span>{fund.progressPercent ?? 0}% of goal</span>
              <span className="tabular-nums">
                target {formatRupiah(fund.targetAmount)}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-muted">No target set</p>
        )}

        {fund.spent > 0 ? (
          <p className="mt-3 text-[11px] text-muted">
            Spent toward this goal{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatRupiah(fund.spent)}
            </span>
          </p>
        ) : null}
      </Card>
    </Link>
  );
}
