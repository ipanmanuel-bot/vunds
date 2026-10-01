import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  RepeatIcon,
  WalletIcon,
} from "@/components/ui/icons";
import type { TransactionListItem as Item } from "@/lib/transactions-data";
import { formatRupiah } from "@/lib/format";

const typeBadge = {
  income: { Icon: ArrowDownIcon, bg: "bg-accent/30 text-accent-strong", sign: "+" },
  expense: { Icon: ArrowUpIcon, bg: "bg-surface-tint text-foreground", sign: "-" },
  refund: { Icon: ArrowDownIcon, bg: "bg-accent/30 text-accent-strong", sign: "+" },
  transfer: { Icon: RepeatIcon, bg: "bg-surface-tint text-muted-strong", sign: "" },
  credit_card_payment: { Icon: WalletIcon, bg: "bg-warm/60 text-warm-fg", sign: "" },
  fund_allocation: { Icon: ArrowRightIcon, bg: "bg-surface-tint text-muted-strong", sign: "" },
} as const;

function title(t: Item): string {
  if (t.merchant) return t.merchant;
  if (t.type === "transfer") return "Transfer";
  if (t.type === "credit_card_payment") return "Credit card payment";
  if (t.type === "fund_allocation") {
    return `Fund allocation${t.counterFundName ? ` → ${t.counterFundName}` : ""}`;
  }
  return t.categoryName ?? t.note ?? "Transaction";
}

function subtitle(t: Item): string {
  const parts: string[] = [];
  if (t.categoryParentName && t.categoryName && t.categoryParentName !== t.categoryName) {
    parts.push(`${t.categoryParentName} · ${t.categoryName}`);
  } else if (t.categoryName) {
    parts.push(t.categoryName);
  }
  if (t.type === "transfer" && t.counterAccountName) {
    parts.push(`${t.accountName ?? "?"} → ${t.counterAccountName}`);
  } else if (t.type === "credit_card_payment" && t.counterAccountName) {
    parts.push(`${t.accountName ?? "?"} → ${t.counterAccountName}`);
  } else if (t.accountName) {
    parts.push(t.accountName);
  }
  return parts.join(" · ");
}

export function TransactionListItem({ item }: { item: Item }) {
  const badge = typeBadge[item.type];
  const Icon = badge.Icon;
  const isPending = item.status === "pending";

  return (
    <Link
      href={`/transactions/${item.id}`}
      className="flex items-center gap-3 py-5 first:pt-0 last:pb-0"
    >
      <div
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${badge.bg}`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{title(item)}</p>
          {isPending ? (
            <span className="shrink-0 rounded-full bg-warm px-2 py-0.5 text-[10px] font-medium text-warm-fg">
              pending
            </span>
          ) : null}
        </div>
        <p className="truncate text-[11px] text-muted">{subtitle(item)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${
            isPending ? "text-muted-strong" : ""
          }`}
        >
          {badge.sign}
          {formatRupiah(item.amount)}
        </p>
      </div>
    </Link>
  );
}
