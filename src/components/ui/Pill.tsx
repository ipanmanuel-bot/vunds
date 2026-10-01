import type { ReactNode } from "react";

type Tone = "warm" | "accent" | "muted" | "surface";

const toneClass: Record<Tone, string> = {
  warm: "bg-warm text-warm-fg",
  accent: "bg-accent/40 text-accent-fg",
  muted: "bg-surface-tint text-muted-strong",
  surface: "bg-surface text-muted-strong",
};

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
