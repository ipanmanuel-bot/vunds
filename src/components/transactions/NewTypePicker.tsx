import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  RepeatIcon,
  WalletIcon,
} from "@/components/ui/icons";
import type { ComponentType, SVGProps } from "react";

interface TypeOption {
  type: string;
  title: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge: string;
}

const options: TypeOption[] = [
  {
    type: "expense",
    title: "Expense",
    description: "Buy goods or services from a bank, cash or credit account.",
    Icon: ArrowUpIcon,
    badge: "bg-surface-tint text-foreground",
  },
  {
    type: "income",
    title: "Income",
    description: "Money received — salary, refunds-as-income, side projects.",
    Icon: ArrowDownIcon,
    badge: "bg-accent/30 text-accent-strong",
  },
  {
    type: "transfer",
    title: "Transfer",
    description: "Move money between your own debit or cash accounts.",
    Icon: RepeatIcon,
    badge: "bg-surface-tint text-muted-strong",
  },
  {
    type: "credit_card_payment",
    title: "Credit card payment",
    description: "Pay down a credit card. Does not count as an expense.",
    Icon: WalletIcon,
    badge: "bg-warm/60 text-warm-fg",
  },
];

export function NewTypePicker() {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">What are you recording?</h2>
      <p className="mt-1 text-xs text-muted">
        Each type captures different information. Transfers and credit card
        payments are not expenses.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {options.map((o) => (
          <li key={o.type}>
            <Link
              href={`/transactions/new?type=${o.type}`}
              className="flex items-center gap-3 rounded-2xl bg-surface-tint p-4"
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${o.badge}`}
                aria-hidden
              >
                <o.Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{o.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">{o.description}</p>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
