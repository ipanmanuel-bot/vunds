import Link from "next/link";

import {
  archiveCategoryAction,
  createCategoryAction,
  createSubcategoryAction,
  renameCategoryAction,
} from "@/app/categories/actions";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import {
  FormField,
  inputClass,
  selectClass,
} from "@/components/ui/FormField";
import { ArrowRightIcon } from "@/components/ui/icons";
import {
  groupCategories,
  listCategoriesForManagement,
  type CategoryManagementRow,
} from "@/lib/categories-manage";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const rows = await listCategoriesForManagement();
  const groups = groupCategories(rows);

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/budgets"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Back
          </Link>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">
            Categories
          </h1>
          <p className="mt-1 text-xs text-muted">
            Describe what money is for. Archived categories stay on historical
            transactions but are hidden when you create new ones.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <NewTopLevelForm />

          {groups.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted">No categories yet.</p>
            </Card>
          ) : (
            groups.map((g) => (
              <CategoryGroupCard key={g.parent.id} group={g} />
            ))
          )}
        </main>
      </div>
    </div>
  );
}

function NewTopLevelForm() {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold">Add a top-level category</h2>
      <p className="mt-1 text-[11px] text-muted">
        Pick its kind — income categories only show on the Income form.
      </p>
      <form
        action={createCategoryAction}
        className="mt-4 flex flex-col gap-3"
      >
        <FormField label="Name" htmlFor="new-name">
          <input
            id="new-name"
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="e.g. Pets"
            className={inputClass}
          />
        </FormField>
        <FormField label="Kind" htmlFor="new-kind">
          <select
            id="new-kind"
            name="kind"
            defaultValue="expense"
            className={selectClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </FormField>
        <button
          type="submit"
          className="mt-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
        >
          Add category
        </button>
      </form>
    </Card>
  );
}

function CategoryGroupCard({
  group,
}: {
  group: { parent: CategoryManagementRow; children: CategoryManagementRow[] };
}) {
  const { parent, children } = group;
  return (
    <Card className="p-5">
      <ParentHeader row={parent} />

      {children.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {children.map((child) => (
            <ChildRow key={child.id} row={child} />
          ))}
        </ul>
      ) : null}

      <div className="mt-4">
        <AddSubcategoryForm parentId={parent.id} />
      </div>
    </Card>
  );
}

function ParentHeader({ row }: { row: CategoryManagementRow }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <RenameInline row={row} />
          <Pill tone={row.kind === "income" ? "accent" : "muted"}>
            {row.kind}
          </Pill>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          {row.transactionCount} transaction
          {row.transactionCount === 1 ? "" : "s"}
        </p>
      </div>
      <ArchiveButton
        id={row.id}
        confirmMessage={`Archive "${row.name}" and all its subcategories? Existing transactions keep their reference; the category just stops appearing in new-transaction forms.`}
      />
    </div>
  );
}

function ChildRow({ row }: { row: CategoryManagementRow }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <RenameInline row={row} />
        <p className="mt-0.5 text-[11px] text-muted">
          {row.transactionCount} transaction
          {row.transactionCount === 1 ? "" : "s"}
        </p>
      </div>
      <ArchiveButton
        id={row.id}
        confirmMessage={`Archive "${row.name}"?`}
      />
    </li>
  );
}

function RenameInline({ row }: { row: CategoryManagementRow }) {
  // One form per row — users submit a rename by pressing Enter.
  return (
    <form action={renameCategoryAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={row.id} />
      <input
        type="text"
        name="name"
        defaultValue={row.name}
        maxLength={60}
        required
        aria-label={`Rename ${row.name}`}
        className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm font-medium outline-none focus:bg-surface-tint"
      />
      <button
        type="submit"
        className="shrink-0 text-[10px] font-medium tracking-wide text-muted uppercase hover:text-foreground"
      >
        Save
      </button>
    </form>
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

function ArchiveButton({
  id,
  confirmMessage,
}: {
  id: string;
  confirmMessage: string;
}) {
  // Hidden input carries the id; the Button is of type=submit inside its own
  // form so a single click archives. No native confirm() — users can un-archive
  // via DB for now (TODO: wire the unarchive action to the UI).
  return (
    <form action={archiveCategoryAction} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-xl bg-surface-tint px-3 py-1.5 text-[11px] font-medium text-[color:var(--danger)]"
        title={confirmMessage}
      >
        Archive
      </button>
    </form>
  );
}
