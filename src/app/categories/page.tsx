import Link from "next/link";

import { createCategoryAction } from "@/app/categories/actions";
import { CategoryGroup } from "@/components/categories/CategoryGroup";
import { Card } from "@/components/ui/Card";
import {
  FormField,
  inputClass,
  selectClass,
} from "@/components/ui/FormField";
import { ArrowRightIcon } from "@/components/ui/icons";
import {
  groupCategories,
  listCategoriesForManagement,
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
            Tap a row to expand. Names save as you type — no save button
            needed.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <NewTopLevelForm />

          {groups.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted">No categories yet.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {groups.map((g) => (
                <CategoryGroup
                  key={g.parent.id}
                  parent={g.parent}
                  // React has a built-in `children` prop that shadows anything
                  // we pass here, so rename to a non-reserved key.
                  childRows={g.children}
                />
              ))}
            </div>
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
