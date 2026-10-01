"use client";

import { useState } from "react";

import { createSubcategoryAction } from "@/app/categories/actions";
import { ArchiveButton } from "@/components/categories/ArchiveButton";
import { AutosaveName } from "@/components/categories/AutosaveName";
import { Pill } from "@/components/ui/Pill";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { CategoryManagementRow } from "@/lib/categories-manage";

export function CategoryGroup({
  parent,
  childRows,
}: {
  parent: CategoryManagementRow;
  childRows: CategoryManagementRow[];
}) {
  // Collapsed by default — the whole point is a scannable overview.
  const [open, setOpen] = useState(false);

  const subLabel =
    childRows.length === 1
      ? "1 subcategory"
      : `${childRows.length} subcategories`;

  // Parent is blocked from archive if the parent itself OR any subcategory
  // has transactions attached, since archive cascades to subcategories.
  const parentTotalTransactions =
    parent.transactionCount +
    childRows.reduce((sum, c) => sum + c.transactionCount, 0);

  return (
    <div className="rounded-[var(--radius-card)] bg-surface shadow-[0_1px_2px_rgba(15,42,31,0.04),0_8px_24px_-12px_rgba(15,42,31,0.08)]">
      {/* Header row */}
      <div className="flex items-start gap-3 p-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${parent.name}` : `Expand ${parent.name}`}
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-tint text-muted-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
        >
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AutosaveName
              id={parent.id}
              initialName={parent.name}
              ariaLabel={`Rename ${parent.name}`}
              className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm font-medium outline-none focus:bg-surface-tint"
            />
            <Pill tone={parent.kind === "income" ? "accent" : "muted"}>
              {parent.kind}
            </Pill>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {subLabel} · {parent.transactionCount} transaction
            {parent.transactionCount === 1 ? "" : "s"}
          </p>
        </div>

        <ArchiveButton
          categoryId={parent.id}
          categoryName={parent.name}
          transactionCount={parentTotalTransactions}
          isParent={true}
        />
      </div>

      {open ? (
        <div className="border-t border-border p-5 pt-4">
          {childRows.length > 0 ? (
            <ul className="flex flex-col divide-y divide-border">
              {childRows.map((child) => (
                <ChildRow key={child.id} row={child} />
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-muted">No subcategories yet.</p>
          )}

          <div className="mt-4">
            <AddSubcategoryForm parentId={parent.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChildRow({ row }: { row: CategoryManagementRow }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <AutosaveName
          id={row.id}
          initialName={row.name}
          ariaLabel={`Rename ${row.name}`}
          className="w-full rounded-md bg-transparent px-1 py-0.5 text-sm outline-none focus:bg-surface-tint"
        />
        <p className="mt-0.5 text-[11px] text-muted">
          {row.transactionCount} transaction
          {row.transactionCount === 1 ? "" : "s"}
        </p>
      </div>
      <ArchiveButton
        categoryId={row.id}
        categoryName={row.name}
        transactionCount={row.transactionCount}
        isParent={false}
      />
    </li>
  );
}

function AddSubcategoryForm({ parentId }: { parentId: string }) {
  return (
    <form
      action={createSubcategoryAction}
      className="flex items-center gap-2 rounded-xl bg-surface-tint p-2"
    >
      <input type="hidden" name="parentId" value={parentId} />
      <input
        type="text"
        name="name"
        required
        maxLength={60}
        placeholder="Add subcategory…"
        aria-label="New subcategory name"
        className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        className="shrink-0 rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background"
      >
        Add
      </button>
    </form>
  );
}
