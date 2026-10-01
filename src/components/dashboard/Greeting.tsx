import { BellIcon } from "@/components/ui/icons";

export function Greeting({
  displayName,
  periodLabel,
}: {
  displayName: string;
  periodLabel: string;
}) {
  const now = new Date();
  const hour = now.getUTCHours();
  const salutation =
    hour < 11 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="flex items-start justify-between pt-6">
      <div>
        <p className="text-sm text-muted">
          {salutation}, {displayName}
        </p>
        <h1 className="mt-1 text-[32px] leading-[1.1] font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-xs text-muted">{periodLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="grid h-11 w-11 place-items-center rounded-2xl bg-surface shadow-[0_1px_2px_rgba(15,42,31,0.04)]"
        >
          <BellIcon className="h-5 w-5 text-foreground" />
        </button>
        <div
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-full bg-accent-strong text-sm font-semibold text-white"
        >
          {displayName.slice(0, 1)}
        </div>
      </div>
    </header>
  );
}
