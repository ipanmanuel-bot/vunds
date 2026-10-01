"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CardIcon,
  HomeIcon,
  ListIcon,
  MoreIcon,
  TargetIcon,
} from "@/components/ui/icons";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const items: NavItem[] = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/transactions", label: "Transactions", Icon: ListIcon },
  { href: "/accounts", label: "Accounts", Icon: CardIcon },
  { href: "/goals", label: "Goals", Icon: TargetIcon },
  { href: "/more", label: "More", Icon: MoreIcon },
];

// Which nav tab, if any, matches the current path. Nested routes like
// /transactions/[id] highlight their parent tab. Routes not in `items`
// (/inbox, /budgets, /api/*) return null → no tab highlighted.
function activeHref(pathname: string): string | null {
  // Exact match wins first so "/" doesn't swallow everything.
  const exact = items.find((i) => i.href === pathname);
  if (exact) return exact.href;
  const prefix = items.find(
    (i) => i.href !== "/" && pathname.startsWith(`${i.href}/`),
  );
  return prefix?.href ?? null;
}

// Rendered once at the root layout level — stays mounted across every
// navigation, so the bar never flashes/disappears during route transitions
// or Suspense/loading boundaries.
export function BottomNav() {
  const pathname = usePathname();
  const active = activeHref(pathname);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/85 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-6">
        {items.map(({ href, label, Icon }) => {
          const isActive = href === active;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-1 text-[10px]"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`h-5 w-5 ${isActive ? "text-foreground" : "text-muted"}`}
                />
                <span className={isActive ? "text-foreground" : "text-muted"}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
