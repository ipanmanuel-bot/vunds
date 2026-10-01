const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount);
}

// Compact form for small spaces: Rp12,5Jt / Rp450Rb.
export function formatRupiahCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}Jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp${Math.round(abs / 1_000)}Rb`;
  }
  return `${sign}Rp${abs}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

export function formatShortDate(d: Date): string {
  return dateFormatter.format(d);
}

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long" });
export function monthName(month: number): string {
  // month is 1-12
  return monthFormatter.format(new Date(2000, month - 1, 1));
}

const monthShortFormatter = new Intl.DateTimeFormat("en-GB", { month: "short" });
export function monthShort(month: number): string {
  return monthShortFormatter.format(new Date(2000, month - 1, 1));
}
