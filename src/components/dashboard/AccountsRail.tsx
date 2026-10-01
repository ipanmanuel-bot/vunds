import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { AccountView } from "@/lib/dashboard-data";
import { formatRupiah } from "@/lib/format";

function AccountCard({ account }: { account: AccountView }) {
  const isCredit = account.type === "credit";
  const typeLabel =
    account.type === "credit"
      ? "Credit card"
      : account.type === "cash"
        ? "Cash"
        : "Debit";

  return (
    <Card className="w-[240px] shrink-0 p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface-tint px-2.5 py-1 text-[11px] font-medium text-muted-strong">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isCredit
                ? "bg-[color:var(--warm-fg)]"
                : "bg-[color:var(--accent-strong)]"
            }`}
            aria-hidden
          />
          {typeLabel}
        </span>
        <span className="text-[11px] text-muted">
          {account.ownerName ?? "Joint"}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-[11px] text-muted">
          {isCredit ? "Outstanding" : "Balance"}
        </p>
        <p className="mt-1 text-[22px] leading-none font-semibold tracking-tight tabular-nums">
          {formatRupiah(isCredit ? (account.outstanding ?? 0) : (account.balance ?? 0))}
        </p>
      </div>

      <div className="mt-5 flex items-end justify-between text-[11px] text-muted">
        <span className="truncate">{account.name}</span>
        {isCredit && account.available != null && account.limit != null ? (
          <span className="tabular-nums">
            {formatRupiah(account.available)} / {formatRupiah(account.limit)}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

export function AccountsRail({ accounts }: { accounts: AccountView[] }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-semibold">Accounts</h2>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-[11px] text-accent-strong"
        >
          See all <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
      </div>
    </section>
  );
}
