import Link from "next/link";

import { Card } from "@/components/ui/Card";
import {
  ArrowRightIcon,
  InboxIcon,
  ListIcon,
  WalletIcon,
} from "@/components/ui/icons";
import type { ComponentType, SVGProps } from "react";

export const dynamic = "force-dynamic";

interface MoreItem {
  href: string;
  label: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const items: MoreItem[] = [
  {
    href: "/categories",
    label: "Customize categories",
    description:
      "Add, rename, or archive the categories you see on expense and income forms.",
    Icon: ListIcon,
  },
  {
    href: "/budgets",
    label: "Monthly budgets",
    description:
      "Set per-category limits and see where you are against them this month.",
    Icon: WalletIcon,
  },
  {
    href: "/inbox",
    label: "Money Inbox",
    description:
      "Review imported transactions and connect Gmail for automatic import.",
    Icon: InboxIcon,
  },
];

export default function MorePage() {
  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <p className="text-xs text-muted">Household finance</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            More
          </h1>
          <p className="mt-1 text-xs text-muted">
            Settings and secondary flows.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-3">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block rounded-[var(--radius-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="flex items-center gap-3 p-5 transition-transform active:scale-[0.995]">
                <div
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-tint text-muted-strong"
                  aria-hidden
                >
                  <it.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{it.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {it.description}
                  </p>
                </div>
                <ArrowRightIcon className="h-4 w-4 text-muted" />
              </Card>
            </Link>
          ))}
        </main>
      </div>
    </div>
  );
}
