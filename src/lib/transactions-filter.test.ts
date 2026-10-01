import { describe, expect, it } from "vitest";
import { filterHref, monthRange, parseFilter } from "./transactions-filter";

const SEP = { year: 2026, month: 9 } as const;

describe("monthRange", () => {
  it("returns first and last day of a 30-day month", () => {
    expect(monthRange(2026, 9)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("returns first and last day of a 31-day month", () => {
    expect(monthRange(2026, 10)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  it("handles February leap year", () => {
    expect(monthRange(2024, 2)).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });
});

describe("parseFilter", () => {
  it("falls back to the default period when no dates provided", () => {
    const f = parseFilter({}, SEP);
    expect(f.from).toBe("2026-09-01");
    expect(f.to).toBe("2026-09-30");
  });

  it("accepts valid YYYY-MM-DD dates", () => {
    const f = parseFilter({ from: "2026-07-15", to: "2026-07-31" }, SEP);
    expect(f.from).toBe("2026-07-15");
    expect(f.to).toBe("2026-07-31");
  });

  it("rejects malformed dates and falls back to default", () => {
    const f = parseFilter({ from: "last-week", to: "today" }, SEP);
    expect(f.from).toBe("2026-09-01");
    expect(f.to).toBe("2026-09-30");
  });

  it("treats 'all' sentinel as no filter", () => {
    const f = parseFilter(
      { accountId: "all", categoryId: "all", memberId: "all" },
      SEP,
    );
    expect(f.accountId).toBeUndefined();
    expect(f.categoryId).toBeUndefined();
    expect(f.memberId).toBeUndefined();
  });

  it("takes the first value when a param repeats", () => {
    const f = parseFilter({ accountId: ["acc-1", "acc-2"] }, SEP);
    expect(f.accountId).toBe("acc-1");
  });
});

describe("filterHref", () => {
  const base = "/transactions";
  const f = {
    from: "2026-09-01",
    to: "2026-09-30",
    accountId: "acc-1",
    categoryId: undefined,
    memberId: undefined,
  };

  it("serialises the current filter", () => {
    expect(filterHref(base, f)).toBe(
      "/transactions?from=2026-09-01&to=2026-09-30&accountId=acc-1",
    );
  });

  it("applies overrides", () => {
    expect(filterHref(base, f, { memberId: "member-1" })).toBe(
      "/transactions?from=2026-09-01&to=2026-09-30&accountId=acc-1&memberId=member-1",
    );
  });

  it("clears a key when the override is null", () => {
    expect(filterHref(base, f, { accountId: null })).toBe(
      "/transactions?from=2026-09-01&to=2026-09-30",
    );
  });

  it("treats 'all' sentinel as cleared", () => {
    expect(filterHref(base, f, { accountId: "all" })).toBe(
      "/transactions?from=2026-09-01&to=2026-09-30",
    );
  });
});
