import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, InboxIcon } from "@/components/ui/icons";

export function MoneyInbox({ pendingCount }: { pendingCount: number }) {
  const hasPending = pendingCount > 0;

  return (
    <Link href="/inbox" className="block rounded-[var(--radius-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <Card
        variant={hasPending ? "surface" : "tint"}
        className="flex items-center justify-between p-5 transition-transform active:scale-[0.995]"
      >
        <div className="flex items-center gap-3">
          <div
            className={`grid h-11 w-11 place-items-center rounded-2xl ${
              hasPending
                ? "bg-warm text-warm-fg"
                : "bg-surface text-muted-strong"
            }`}
            aria-hidden
          >
            <InboxIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Money Inbox</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {hasPending
                ? `${pendingCount} imported transaction${pendingCount === 1 ? "" : "s"} to review`
                : "All imported transactions reviewed"}
            </p>
          </div>
        </div>
        <ArrowRightIcon className="h-4 w-4 text-muted" />
      </Card>
    </Link>
  );
}
