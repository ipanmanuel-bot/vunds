import Link from "next/link";
import { notFound } from "next/navigation";

import { TransactionList } from "@/components/transactions/TransactionList";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getAccount } from "@/lib/accounts-data";
import { formatRupiah } from "@/lib/format";
import { listTransactions } from "@/lib/transactions-data";

export const dynamic = "force-dynamic";

const typeLabel = {
  debit: "Debit",
  cash: "Cash",
  credit: "Credit card",
} as const;

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();

  // Full history for this account — bounded only by Postgres's date range so
  // we see everything that ever touched the account. The seed only has ~24
  // rows total so this is cheap; later we'll paginate.
  const transactions = await listTransactions({
    from: "1900-01-01",
    to: "9999-12-31",
    accountId: id,
  });

  const isCredit = account.type === "credit";
  const utilizationTone =
    account.utilizationPercent != null && account.utilizationPercent >= 80
      ? "warm"
      : "accent";

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Accounts
          </Link>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Pill tone="muted">{typeLabel[account.type]}</Pill>
              <span className="text-[11px] text-muted">
                {account.ownerName ?? "Joint"} · {account.currency}
              </span>
            </div>
            <p className="mt-4 text-sm font-medium">{account.name}</p>

            {isCredit ? (
              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs tracking-wide text-muted uppercase">
                    Outstanding
                  </p>
                  <p className="mt-1 text-[36px] leading-none font-semibold tracking-tight tabular-nums">
                    {formatRupiah(account.outstanding ?? 0)}
                  </p>
                </div>
                {account.limit != null ? (
                  <div className="rounded-2xl bg-surface-tint p-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Utilization</span>
                      <span className="font-medium text-muted-strong tabular-nums">
                        {account.utilizationPercent}% of{" "}
                        {formatRupiah(account.limit)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <ProgressBar
                        percent={account.utilizationPercent ?? 0}
                        tone={utilizationTone}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="text-muted">Available</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {formatRupiah(account.available ?? 0)}
                      </span>
                    </div>
                  </div>
                ) : null}
                <p className="text-[11px] text-muted">
                  Credit card outstanding is money you owe. It is a liability,
                  not cash.
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs tracking-wide text-muted uppercase">
                    Balance
                  </p>
                  <p className="mt-1 text-[36px] leading-none font-semibold tracking-tight tabular-nums">
                    {formatRupiah(account.balance ?? 0)}
                  </p>
                </div>
                <p className="text-[11px] text-muted">
                  Opening balance{" "}
                  <span className="tabular-nums text-foreground">
                    {formatRupiah(account.openingBalance)}
                  </span>
                  . Current balance is derived from opening plus confirmed
                  transactions.
                </p>
              </div>
            )}
          </Card>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Activity</h2>
            <TransactionList items={transactions} />
          </section>
        </main>
      </div>
    </div>
  );
}
