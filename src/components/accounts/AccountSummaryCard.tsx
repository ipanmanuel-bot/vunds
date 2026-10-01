import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatRupiah } from "@/lib/format";
import type { AccountSummary } from "@/lib/accounts-data";

const typeLabel: Record<AccountSummary["type"], string> = {
  debit: "Debit",
  cash: "Cash",
  credit: "Credit card",
};

export function AccountSummaryCard({ account }: { account: AccountSummary }) {
  const isCredit = account.type === "credit";

  const utilizationTone =
    account.utilizationPercent != null && account.utilizationPercent >= 80
      ? "warm"
      : "accent";

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="block rounded-[var(--radius-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="p-5 transition-transform active:scale-[0.995]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isCredit
                  ? "bg-[color:var(--warm-fg)]"
                  : "bg-[color:var(--accent-strong)]"
              }`}
              aria-hidden
            />
            <span className="text-xs text-muted-strong">
              {typeLabel[account.type]}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted">
            {account.ownerName ?? "Joint"}
            <ArrowRightIcon className="h-3 w-3" />
          </span>
        </div>

        <p className="mt-4 text-sm font-medium">{account.name}</p>

        {isCredit ? (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[11px] text-muted">Outstanding</p>
              <p className="text-[26px] leading-none font-semibold tabular-nums">
                {formatRupiah(account.outstanding ?? 0)}
              </p>
            </div>
            {account.limit != null ? (
              <>
                <div>
                  <ProgressBar
                    percent={account.utilizationPercent ?? 0}
                    tone={utilizationTone}
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                    <span>{account.utilizationPercent ?? 0}% used</span>
                    <span className="tabular-nums">
                      Limit {formatRupiah(account.limit)}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted">
                  Available{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatRupiah(account.available ?? 0)}
                  </span>
                </p>
              </>
            ) : null}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-[11px] text-muted">Balance</p>
            <p className="text-[26px] leading-none font-semibold tabular-nums">
              {formatRupiah(account.balance ?? 0)}
            </p>
            <p className="mt-2 text-[11px] text-muted">
              Opening{" "}
              <span className="tabular-nums">
                {formatRupiah(account.openingBalance)}
              </span>
            </p>
          </div>
        )}
      </Card>
    </Link>
  );
}
