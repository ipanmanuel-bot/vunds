"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { setBudgetAmountAction } from "@/app/budgets/actions";

// Autosaving numeric input for the per-category budget. Debounced save on
// change, immediate save on blur or Enter. Pressing Escape reverts.
// Entering 0 (or clearing the field) deletes the budget row for that period
// → the category becomes "not budgeted".
export function AutosaveBudgetAmount({
  categoryId,
  year,
  month,
  initialAmount,
}: {
  categoryId: string;
  year: number;
  month: number;
  initialAmount: number;
}) {
  const [value, setValue] = useState(formatForInput(initialAmount));
  const [savedValue, setSavedValue] = useState(formatForInput(initialAmount));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const save = (raw: string) => {
    const parsed = parseAmount(raw);
    if (parsed === null) {
      setError("Enter a number");
      return;
    }
    if (parsed === parseAmount(savedValue)) return;

    const fd = new FormData();
    fd.set("categoryId", categoryId);
    fd.set("year", String(year));
    fd.set("month", String(month));
    fd.set("amount", String(parsed));

    startTransition(async () => {
      try {
        await setBudgetAmountAction(fd);
        setSavedValue(formatForInput(parsed));
        setValue(formatForInput(parsed));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  useEffect(() => () => clearTimer(), []);

  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
          clearTimer();
          const next = e.target.value;
          timer.current = setTimeout(() => save(next), 700);
        }}
        onBlur={() => {
          clearTimer();
          save(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setValue(savedValue);
            setError(null);
            clearTimer();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        aria-label="Budget amount"
        aria-busy={pending}
        aria-invalid={error ? true : undefined}
        placeholder="0"
        className={`w-28 rounded-md bg-transparent px-1.5 py-0.5 text-right text-sm font-semibold tabular-nums outline-none focus:bg-surface-tint ${
          pending ? "opacity-70" : ""
        } ${error ? "text-[color:var(--danger)]" : ""}`}
      />
    </div>
  );
}

// Store amounts as plain integers in the DB. The display input uses
// Indonesian thousands (`.`) formatting. Parse strips any non-digit chars.
function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits === "") return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatForInput(n: number): string {
  if (n === 0) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}
