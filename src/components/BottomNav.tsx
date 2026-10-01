import Link from "next/link";
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

export function BottomNav({
  activeHref,
}: {
  // Pass `null` on routes that aren't in the nav (e.g. /inbox, /budgets)
  // so no tab is misleadingly highlighted.
  activeHref: string | null;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/85 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-6">
        {items.map(({ href, label, Icon }) => {
          const active = href === activeHref;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-1 text-[10px]"
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "text-foreground" : "text-muted"}`}
                />
                <span className={active ? "text-foreground" : "text-muted"}>
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
