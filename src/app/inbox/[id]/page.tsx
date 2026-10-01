import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmForm } from "@/components/inbox/ConfirmForm";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getPending } from "@/lib/inbox-data";
import { formatRupiah, formatShortDate } from "@/lib/format";
import { getFormOptions } from "@/lib/transactions-data";

export const dynamic = "force-dynamic";

export default async function PendingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, options] = await Promise.all([getPending(id), getFormOptions()]);
  if (!item) notFound();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Money Inbox
          </Link>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Pill tone="warm">pending</Pill>
              {item.importSource ? (
                <span className="text-[11px] text-muted">
                  via {item.importSource}
                  {item.importProvider ? ` · ${item.importProvider}` : ""}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-sm font-medium">
              {item.merchant ?? "Unknown merchant"}
            </p>
            <p className="mt-2 text-[36px] leading-none font-semibold tracking-tight tabular-nums">
              -{formatRupiah(item.amount)}
            </p>
            <p className="mt-2 text-xs text-muted">
              {item.accountName ?? "Unknown account"} ·{" "}
              {formatShortDate(item.date)}
            </p>
          </Card>

          {item.suggestion ? (
            <Card variant="tint" className="p-4">
              <p className="text-[11px] text-muted">Categorizer suggestion</p>
              <p className="mt-1 text-sm font-medium">
                {item.suggestion.parentCategoryName &&
                item.suggestion.parentCategoryName !==
                  item.suggestion.categoryName
                  ? `${item.suggestion.parentCategoryName} · ${item.suggestion.categoryName}`
                  : item.suggestion.categoryName}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Matched rule &ldquo;{item.suggestion.matchedPattern}&rdquo; (
                {item.suggestion.matchType})
              </p>
            </Card>
          ) : (
            <Card variant="tint" className="p-4">
              <p className="text-[11px] text-muted">Categorizer suggestion</p>
              <p className="mt-1 text-sm font-medium">
                UNKNOWN — no rule matched this merchant.
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Pick a category below. Tick &ldquo;Remember this rule&rdquo; so
                the next similar import auto-categorises.
              </p>
            </Card>
          )}

          <ConfirmForm
            item={item}
            categories={options.categories}
            funds={options.funds}
          />
        </main>
      </div>
    </div>
  );
}
