"use client";

import { useFormStatus } from "react-dom";

// Submit button that disables itself and swaps its label while its parent
// <form> is submitting. React blocks UI updates during a server-action
// submission anyway — this at least makes it visible that something is in
// flight.
export function SubmitButton({
  idleLabel,
  pendingLabel = "Working…",
  tone = "primary",
}: {
  idleLabel: string;
  pendingLabel?: string;
  tone?: "primary" | "muted" | "danger";
}) {
  const { pending } = useFormStatus();

  const className =
    tone === "primary"
      ? `w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background disabled:opacity-70`
      : tone === "danger"
        ? `w-full rounded-xl border border-[color:var(--danger)] bg-transparent py-3 text-sm font-medium text-[color:var(--danger)] disabled:opacity-70`
        : `w-full rounded-xl bg-surface-tint py-2 text-xs font-medium text-muted-strong disabled:opacity-70`;

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
