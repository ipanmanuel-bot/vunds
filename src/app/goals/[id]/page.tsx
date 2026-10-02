import Link from "next/link";
import { notFound } from "next/navigation";

import { TransactionList } from "@/components/transactions/TransactionList";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getFund, getFundActivity } from "@/lib/funds-data";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [fund, activity] = await Promise.all([getFund(id), getFundActivity(id)]);
  if (!fund) notFound();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/goals"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Goals
          </Link>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Pill tone="muted">Fund</Pill>
              <span className="text-[11px] text-muted">{fund.currency}</span>
            </div>
            <p className="mt-4 text-sm font-medium">{fund.name}</p>

            {/* The hero now leads with "Left in pocket" so the user sees at
                a glance how much they can still spend from the fund without
                going negative. Over-draw turns the number red. */}
            <div className="mt-4">
              <p className="text-xs tracking-wide text-muted uppercase">
                Left in this pocket
              </p>
              <p
                className={`mt-1 text-[36px] leading-none font-semibold tracking-tight tabular-nums ${
                  fund.remaining < 0
                    ? "text-[color:var(--danger)]"
                    : "text-foreground"
                }`}
              >
                {fund.remaining < 0 ? "−" : ""}
                {formatRupiah(Math.abs(fund.remaining))}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-tint p-3">
                <p className="text-[11px] text-muted">Allocated</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatRupiah(fund.allocated)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-tint p-3">
                <p className="text-[11px] text-muted">Spent from fund</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatRupiah(fund.spent)}
                </p>
              </div>
            </div>

            {fund.targetAmount != null ? (
              <div className="mt-4 rounded-2xl bg-surface-tint p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Savings progress</span>
                  <span className="font-medium text-muted-strong tabular-nums">
                    {formatRupiah(fund.allocated)} /{" "}
                    {formatRupiah(fund.targetAmount)}
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar percent={fund.progressPercent ?? 0} />
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  {fund.progressPercent ?? 0}% of goal
                </p>
              </div>
            ) : null}

            <p className="mt-3 text-[11px] text-muted">
              Spending tagged to this fund draws from this pocket. It does{" "}
              <strong>not</strong> count toward your monthly budget.
            </p>
          </Card>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Activity</h2>
            <TransactionList items={activity} />
          </section>
        </main>
      </div>
    </div>
  );
}
