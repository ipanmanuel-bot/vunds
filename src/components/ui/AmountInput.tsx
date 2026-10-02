"use client";

import { useState } from "react";

import { inputClass } from "./FormField";

// Numeric input with live Indonesian thousand-separator formatting. Typing
// "1000" shows "1.000" immediately; typing "10000000" shows "10.000.000".
// Posts the formatted string via its `name` attribute — server-side
// parsers strip non-digits (num()) so the formatting is transparent to
// business logic.
//
// Uses type="text" (not type="number") because number inputs reject the
// dot character on insert in strict browsers. inputMode="numeric" still
// summons the numeric keypad on mobile.
export function AmountInput({
  id,
  name,
  defaultValue,
  required,
  placeholder,
  autoFocus,
  className,
}: {
  id: string;
  name: string;
  defaultValue?: number | string;
  required?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const initial =
    typeof defaultValue === "number"
      ? formatIDR(String(Math.max(0, Math.round(defaultValue))))
      : typeof defaultValue === "string"
        ? formatIDR(defaultValue.replace(/\D/g, ""))
        : "";
  const [value, setValue] = useState(initial);

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      required={required}
      placeholder={placeholder ?? "0"}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => setValue(formatIDR(e.target.value.replace(/\D/g, "")))}
      className={className ?? inputClass}
    />
  );
}

// "1000" → "1.000", "10000000" → "10.000.000", "" → "".
// Drops leading zeros so "01000" collapses to "1.000".
function formatIDR(digits: string): string {
  if (digits.length === 0) return "";
  const cleaned = digits.replace(/^0+(?=\d)/, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}
