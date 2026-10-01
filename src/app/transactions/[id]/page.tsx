import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatRupiah, formatShortDate } from "@/lib/format";
import { getTransaction } from "@/lib/transactions-data";
import type { TransactionType } from "@/lib/finance";

export const dynamic = "force-dynamic";

const typeLabel: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  credit_card_payment: "Credit card payment",
  fund_allocation: "Fund allocation",
  refund: "Refund",
};

const amountSign: Record<TransactionType, "+" | "-" | ""> = {
  income: "+",
  refund: "+",
  expense: "-",
  transfer: "",
  credit_card_payment: "",
  fund_allocation: "",
};

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tx = await getTransaction(id);
  if (!tx) notFound();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Transactions
          </Link>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Pill tone="muted">{typeLabel[tx.type]}</Pill>
              {tx.status !== "confirmed" ? (
                <Pill tone={tx.status === "pending" ? "warm" : "muted"}>
                  {tx.status}
                </Pill>
              ) : null}
            </div>
            <p className="mt-4 text-[36px] leading-none font-semibold tracking-tight tabular-nums">
              {amountSign[tx.type]}
              {formatRupiah(tx.amount)}
            </p>
            <p className="mt-2 text-sm text-muted">
              {formatShortDate(tx.date)}
            </p>
          </Card>

          <Card className="p-5">
            <dl className="divide-y divide-border">
              <Row
                label={
                  tx.type === "transfer" || tx.type === "credit_card_payment"
                    ? "From account"
                    : "Account"
                }
                value={tx.accountName}
              />
              {tx.counterAccountName ? (
                <Row label="To account" value={tx.counterAccountName} />
              ) : null}
              {tx.categoryName ? (
                <Row
                  label="Category"
                  value={
                    tx.categoryParentName &&
                    tx.categoryParentName !== tx.categoryName
                      ? `${tx.categoryParentName} · ${tx.categoryName}`
                      : tx.categoryName
                  }
                />
              ) : null}
              {tx.fundName ? (
                <Row label="Fund" value={tx.fundName} />
              ) : null}
              {tx.counterFundName ? (
                <Row label="To fund" value={tx.counterFundName} />
              ) : null}
              {tx.merchant ? (
                <Row label="Merchant" value={tx.merchant} />
              ) : null}
              {tx.refundOfId ? (
                <Row
                  label="Refund of"
                  value={
                    <Link
                      href={`/transactions/${tx.refundOfId}`}
                      className="text-accent-strong hover:underline"
                    >
                      {tx.refundOfMerchant ?? "Original expense"}
                    </Link>
                  }
                />
              ) : null}
              {tx.createdByName ? (
                <Row label="Entered by" value={tx.createdByName} />
              ) : null}
              {tx.note ? <Row label="Note" value={tx.note} /> : null}
            </dl>
          </Card>
        </main>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
