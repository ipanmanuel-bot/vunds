// Merchant → category suggestion.
//
// Pure function. Zero React, zero SQL. The caller fetches rules + categories
// from the DB and passes them in. On no match this returns `null` — the
// transaction stays UNKNOWN and the user must categorise it manually
// (docs/financial-logic.md §15, docs/gmail-integration.md §PARSING FAILURE).
//
// Rule evaluation order:
//   1. Sort by `priority` ascending (lower number wins).
//   2. First match wins. Later rules are not consulted.
//
// Match semantics (case-insensitive after trim):
//   exact    — merchant == pattern
//   contains — merchant contains pattern as a substring (user-facing name: "keyword")
//   regex    — JS regex match against the raw merchant; invalid regex → no match

export type MatchType = "exact" | "contains" | "regex";

export interface MerchantRule {
  id: string;
  pattern: string;
  matchType: MatchType;
  categoryId: string | null;
  fundId: string | null;
  priority: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
}

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  fundId: string | null;
  matchedRuleId: string;
  matchedPattern: string;
  matchType: MatchType;
}

function normalise(s: string): string {
  return s.trim().toLowerCase();
}

export function matchesRule(rule: MerchantRule, merchant: string): boolean {
  if (!merchant.trim() || !rule.pattern.trim()) return false;
  const n = normalise(merchant);
  const p = normalise(rule.pattern);
  switch (rule.matchType) {
    case "exact":
      return n === p;
    case "contains":
      return n.includes(p);
    case "regex": {
      try {
        return new RegExp(rule.pattern, "i").test(merchant);
      } catch {
        return false;
      }
    }
  }
}

export function suggestCategory(
  merchant: string | null | undefined,
  rules: readonly MerchantRule[],
  categoriesById: ReadonlyMap<string, CategoryInfo>,
): CategorySuggestion | null {
  if (!merchant || !merchant.trim()) return null;

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (!rule.categoryId) continue;
    if (!matchesRule(rule, merchant)) continue;

    const cat = categoriesById.get(rule.categoryId);
    if (!cat) continue;

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      parentCategoryId: cat.parentId,
      parentCategoryName: cat.parentName,
      fundId: rule.fundId,
      matchedRuleId: rule.id,
      matchedPattern: rule.pattern,
      matchType: rule.matchType,
    };
  }

  return null;
}
