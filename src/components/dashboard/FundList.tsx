import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { FundView } from "@/lib/dashboard-data";
import { formatRupiah } from "@/lib/format";

function FundRow({ fund }: { fund: FundView }) {
  const target = fund.targetAmount && fund.targetAmount > 0 ? fund.targetAmount : null;
  const percent =
    target != null
      ? Math.min(100, Math.round((fund.allocated / target) * 100))
      : null;

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{fund.name}</span>
        <span className="text-sm font-semibold tabular-nums">
          {formatRupiah(fund.allocated)}
        </span>
      </div>
      {target != null && percent != null ? (
        <>
          <ProgressBar percent={percent} />
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>{percent}% of goal</span>
            <span className="tabular-nums">
              target {formatRupiah(target)}
            </span>
          </div>
        </>
      ) : (
        <p className="text-[11px] text-muted">No target set</p>
      )}
    </li>
  );
}

export function FundList({ funds }: { funds: FundView[] }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold">Funds</h2>
          <p className="text-[11px] text-muted">
            Virtual allocations — not cash
          </p>
        </div>
        <Link
          href="/goals"
          className="inline-flex items-center gap-1 text-[11px] text-accent-strong"
        >
          See all <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {funds.map((f) => (
          <FundRow key={f.id} fund={f} />
        ))}
      </ul>
    </Card>
  );
}
