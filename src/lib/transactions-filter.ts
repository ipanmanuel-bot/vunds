// URL ↔ TransactionFilter.
//
// Filters live in the URL so views are shareable/bookmarkable. The list page
// reads filters from its `searchParams` prop, this module parses them, the
// data layer applies them, and the FilterBar component serialises them back
// to href strings for navigation.

export interface TransactionFilter {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  accountId?: string;
  categoryId?: string;
  memberId?: string; // owner filter: null means "household (all)"
}

export interface FilterInput {
  from?: string | string[];
  to?: string | string[];
  accountId?: string | string[];
  categoryId?: string | string[];
  memberId?: string | string[];
}

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const isDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

// Return the first and last day of the given month as "YYYY-MM-DD".
export function monthRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(last)}`,
  };
}

export function parseFilter(
  input: FilterInput,
  defaultPeriod: { year: number; month: number },
): TransactionFilter {
  const defaults = monthRange(defaultPeriod.year, defaultPeriod.month);

  const fromRaw = first(input.from);
  const toRaw = first(input.to);
  const accountId = first(input.accountId);
  const categoryId = first(input.categoryId);
  const memberId = first(input.memberId);

  return {
    from: fromRaw && isDate(fromRaw) ? fromRaw : defaults.from,
    to: toRaw && isDate(toRaw) ? toRaw : defaults.to,
    accountId: accountId && accountId !== "all" ? accountId : undefined,
    categoryId: categoryId && categoryId !== "all" ? categoryId : undefined,
    memberId: memberId && memberId !== "all" ? memberId : undefined,
  };
}

// Build a href for `/transactions` with the current filter plus overrides.
// Passing `null` for a key clears it.
export function filterHref(
  base: string,
  filter: TransactionFilter,
  overrides: Partial<Record<keyof TransactionFilter, string | null>> = {},
): string {
  const params = new URLSearchParams();
  const merged: Record<string, string | null | undefined> = {
    from: filter.from,
    to: filter.to,
    accountId: filter.accountId,
    categoryId: filter.categoryId,
    memberId: filter.memberId,
    ...overrides,
  };
  for (const [k, v] of Object.entries(merged)) {
    if (v && v !== "all") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
