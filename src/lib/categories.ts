// Category tree helpers.
//
// Budgets attach to a category id. "Spending in the Food budget" means spending
// in Food OR any of its subcategories, so these helpers walk the tree.

export interface CategoryTreeNode {
  id: string;
  parentId: string | null;
}

// Map of parentId -> childIds.
export function buildChildrenMap(
  rows: readonly CategoryTreeNode[],
): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const c of rows) {
    if (c.parentId) {
      const arr = children.get(c.parentId) ?? [];
      arr.push(c.id);
      children.set(c.parentId, arr);
    }
  }
  return children;
}

// All descendants of `rootId` (inclusive). Depth-first; cycle-safe because we
// only enqueue ids we haven't visited.
export function getDescendantIds(
  childrenMap: Map<string, string[]>,
  rootId: string,
): Set<string> {
  const visited = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const child of childrenMap.get(cur) ?? []) {
      if (!visited.has(child)) {
        visited.add(child);
        stack.push(child);
      }
    }
  }
  return visited;
}
