import { Card } from "@/components/ui/Card";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  RepeatIcon,
  WalletIcon,
} from "@/components/ui/icons";
import type { TransactionView } from "@/lib/dashboard-data";
import { formatRupiah, formatShortDate } from "@/lib/format";

const typeBadge: Record<
  TransactionView["type"],
  { icon: typeof ArrowDownIcon; className: string; sign: "+" | "-" | "" }
> = {
  income: {
    icon: ArrowDownIcon,
    className: "bg-accent/30 text-accent-strong",
    sign: "+",
  },
  expense: {
    icon: ArrowUpIcon,
    className: "bg-surface-tint text-foreground",
    sign: "-",
  },
  transfer: {
    icon: RepeatIcon,
    className: "bg-surface-tint text-muted-strong",
    sign: "",
  },
  credit_card_payment: {
    icon: WalletIcon,
    className: "bg-warm/60 text-warm-fg",
    sign: "",
  },
  fund_allocation: {
    icon: ArrowRightIcon,
    className: "bg-surface-tint text-muted-strong",
    sign: "",
  },
  refund: {
    icon: ArrowDownIcon,
    className: "bg-accent/30 text-accent-strong",
    sign: "+",
  },
  adjustment_increase: {
    icon: ArrowDownIcon,
    className: "bg-surface-tint text-muted-strong",
    sign: "+",
  },
  adjustment_decrease: {
    icon: ArrowUpIcon,
    className: "bg-surface-tint text-muted-strong",
    sign: "-",
  },
};

function title(t: TransactionView): string {
  if (t.merchant) return t.merchant;
  if (t.type === "transfer")
    return `Transfer${t.accountName ? ` from ${t.accountName}` : ""}`;
  if (t.type === "credit_card_payment") return "Credit card payment";
  if (t.type === "fund_allocation") return "Fund allocation";
  return t.categoryName ?? t.note ?? "Transaction";
}

function subtitle(t: TransactionView): string {
  const parts: string[] = [];
  if (t.categoryParent && t.categoryName && t.categoryParent !== t.categoryName)
    parts.push(`${t.categoryParent} · ${t.categoryName}`);
  else if (t.categoryName) parts.push(t.categoryName);
  if (t.type === "transfer" && t.counterAccountName)
    parts.push(`→ ${t.counterAccountName}`);
  else if (t.type === "credit_card_payment" && t.counterAccountName)
    parts.push(`→ ${t.counterAccountName}`);
  else if (t.accountName) parts.push(t.accountName);
  return parts.join(" · ");
}

export function RecentTransactions({ items }: { items: TransactionView[] }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-semibold">Recent transactions</h2>
        <button className="text-[11px] text-accent-strong hover:underline">
          See all
        </button>
      </div>
      <ul className="divide-y divide-border">
        {items.map((t) => {
          const badge = typeBadge[t.type];
          const Icon = badge.icon;
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${badge.className}`}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title(t)}</p>
                <p className="truncate text-[11px] text-muted">{subtitle(t)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {badge.sign}
                  {formatRupiah(t.amount)}
                </p>
                <p className="text-[11px] text-muted">
                  {formatShortDate(t.date)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
