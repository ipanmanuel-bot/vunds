import { describe, expect, it } from "vitest";

import {
  type CategoryInfo,
  type MerchantRule,
  matchesRule,
  suggestCategory,
} from "./categorize";

const cat = (
  overrides: Partial<CategoryInfo> & Pick<CategoryInfo, "id" | "name">,
): CategoryInfo => ({
  parentId: null,
  parentName: null,
  ...overrides,
});

const rule = (
  overrides: Partial<MerchantRule> & Pick<MerchantRule, "id" | "pattern" | "matchType" | "categoryId">,
): MerchantRule => ({
  fundId: null,
  priority: 100,
  ...overrides,
});

describe("matchesRule", () => {
  it("exact: case-insensitive full match", () => {
    const r = rule({ id: "1", pattern: "Starbucks", matchType: "exact", categoryId: "c" });
    expect(matchesRule(r, "starbucks")).toBe(true);
    expect(matchesRule(r, "STARBUCKS")).toBe(true);
    expect(matchesRule(r, "Starbucks Jakarta")).toBe(false);
  });

  it("contains: substring match (keyword rule)", () => {
    const r = rule({ id: "1", pattern: "grab", matchType: "contains", categoryId: "c" });
    expect(matchesRule(r, "GRAB Food")).toBe(true);
    expect(matchesRule(r, "payment to grab-ride")).toBe(true);
    expect(matchesRule(r, "Blibli")).toBe(false);
  });

  it("regex: honoured; invalid regex returns false without throwing", () => {
    const r = rule({ id: "1", pattern: "^Netflix \\d+$", matchType: "regex", categoryId: "c" });
    expect(matchesRule(r, "Netflix 2026")).toBe(true);
    expect(matchesRule(r, "Netflix")).toBe(false);
    const bad = rule({ id: "2", pattern: "(unclosed", matchType: "regex", categoryId: "c" });
    expect(matchesRule(bad, "anything")).toBe(false);
  });

  it("rejects empty merchant or empty pattern", () => {
    const r = rule({ id: "1", pattern: "x", matchType: "contains", categoryId: "c" });
    expect(matchesRule(r, "")).toBe(false);
    expect(matchesRule(r, "   ")).toBe(false);
    const empty = rule({ id: "2", pattern: "", matchType: "contains", categoryId: "c" });
    expect(matchesRule(empty, "Starbucks")).toBe(false);
  });
});

describe("suggestCategory", () => {
  const catsById = new Map<string, CategoryInfo>([
    [
      "food",
      cat({ id: "food", name: "Food" }),
    ],
    [
      "coffee",
      cat({ id: "coffee", name: "Coffee", parentId: "food", parentName: "Food" }),
    ],
    [
      "dining",
      cat({ id: "dining", name: "Dining", parentId: "food", parentName: "Food" }),
    ],
    [
      "stream",
      cat({ id: "stream", name: "Streaming", parentId: "ent", parentName: "Entertainment" }),
    ],
  ]);

  it("returns null for unknown merchant (UNKNOWN stays UNKNOWN)", () => {
    const rules: MerchantRule[] = [
      rule({ id: "1", pattern: "Starbucks", matchType: "contains", categoryId: "coffee" }),
    ];
    expect(suggestCategory("Totally New Store", rules, catsById)).toBeNull();
    expect(suggestCategory(null, rules, catsById)).toBeNull();
    expect(suggestCategory("", rules, catsById)).toBeNull();
    expect(suggestCategory("   ", rules, catsById)).toBeNull();
  });

  it("picks the matching rule and surfaces parent + fund", () => {
    const rules: MerchantRule[] = [
      rule({
        id: "r1",
        pattern: "Starbucks",
        matchType: "contains",
        categoryId: "coffee",
        fundId: "fund-x",
      }),
    ];
    const s = suggestCategory("Starbucks Grand Indonesia", rules, catsById);
    expect(s).not.toBeNull();
    expect(s!.categoryId).toBe("coffee");
    expect(s!.categoryName).toBe("Coffee");
    expect(s!.parentCategoryId).toBe("food");
    expect(s!.parentCategoryName).toBe("Food");
    expect(s!.fundId).toBe("fund-x");
    expect(s!.matchedRuleId).toBe("r1");
  });

  it("priority: lower number wins; equal priority = first in input order (after sort)", () => {
    const rules: MerchantRule[] = [
      rule({ id: "late", pattern: "shop", matchType: "contains", categoryId: "dining", priority: 500 }),
      rule({ id: "early", pattern: "shop", matchType: "contains", categoryId: "coffee", priority: 10 }),
    ];
    const s = suggestCategory("corner shop", rules, catsById);
    expect(s!.matchedRuleId).toBe("early");
    expect(s!.categoryId).toBe("coffee");
  });

  it("skips rules whose categoryId points to an unknown category", () => {
    const rules: MerchantRule[] = [
      rule({ id: "ghost", pattern: "X", matchType: "contains", categoryId: "no-such-cat" }),
      rule({ id: "real", pattern: "X", matchType: "contains", categoryId: "coffee" }),
    ];
    const s = suggestCategory("XYZ", rules, catsById);
    expect(s!.matchedRuleId).toBe("real");
  });

  it("skips rules with null categoryId (safety; shouldn't happen in prod)", () => {
    const rules: MerchantRule[] = [
      rule({ id: "none", pattern: "X", matchType: "contains", categoryId: null }),
      rule({ id: "real", pattern: "X", matchType: "contains", categoryId: "coffee" }),
    ];
    const s = suggestCategory("XYZ", rules, catsById);
    expect(s!.matchedRuleId).toBe("real");
  });

  it("no fund suggestion when rule has no fundId", () => {
    const rules: MerchantRule[] = [
      rule({ id: "r", pattern: "Netflix", matchType: "exact", categoryId: "stream" }),
    ];
    const s = suggestCategory("Netflix", rules, catsById);
    expect(s!.fundId).toBeNull();
  });
});
