import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { PendingItem } from "@/lib/inbox-data";
import { formatRupiah, formatShortDate } from "@/lib/format";

export function InboxItem({ item }: { item: PendingItem }) {
  const suggestion = item.suggestion;

  return (
    <Link href={`/inbox/${item.id}`} className="block rounded-[var(--radius-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <Card className="p-4 transition-transform active:scale-[0.995]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium">
                {item.merchant ?? "Unknown merchant"}
              </p>
              {suggestion ? null : (
                <Pill tone="warm">Needs category</Pill>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted">
              {item.accountName ?? "Unknown account"} ·{" "}
              {formatShortDate(item.date)}
              {item.importProvider ? ` · ${item.importProvider}` : ""}
            </p>

            {suggestion ? (
              <p className="mt-2 text-[11px] text-muted">
                Suggested:{" "}
                <span className="font-medium text-foreground">
                  {suggestion.parentCategoryName &&
                  suggestion.parentCategoryName !== suggestion.categoryName
                    ? `${suggestion.parentCategoryName} · ${suggestion.categoryName}`
                    : suggestion.categoryName}
                </span>
                <span className="text-muted">
                  {" "}
                  — rule matched &ldquo;{suggestion.matchedPattern}&rdquo;
                </span>
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatRupiah(item.amount)}
            </p>
            <ArrowRightIcon className="ml-auto mt-1 h-4 w-4 text-muted" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
