import Link from "next/link";

import {
  confirmPendingAction,
  rejectPendingAction,
} from "@/app/inbox/actions";
import { Card } from "@/components/ui/Card";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/FormField";
import type { PendingItem } from "@/lib/inbox-data";
import type { CategoryOption, FundOption } from "@/lib/transactions-data";

export function ConfirmForm({
  item,
  categories,
  funds,
}: {
  item: PendingItem;
  categories: CategoryOption[];
  funds: FundOption[];
}) {
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const suggestedCategoryId = item.suggestion?.categoryId ?? "";
  const suggestedFundId = item.suggestion?.fundId ?? "";

  // "Remember" defaults on when the categorizer couldn't suggest anything
  // (confirming teaches the system). It defaults off when a suggestion
  // existed — accepting as-is means the existing rule is already correct.
  const defaultRememberOn = item.suggestion == null;

  return (
    <>
      <Card className="p-5">
        <form action={confirmPendingAction} className="flex flex-col gap-4">
          <input type="hidden" name="transactionId" value={item.id} />

          <FormField
            label="Merchant"
            htmlFor="merchant"
            hint="Edit this to normalise the merchant string before saving as a rule."
          >
            <input
              id="merchant"
              name="merchant"
              type="text"
              defaultValue={item.merchant ?? ""}
              className={inputClass}
            />
          </FormField>

          <FormField label="Category" htmlFor="categoryId">
            <select
              id="categoryId"
              name="categoryId"
              required
              defaultValue={suggestedCategoryId}
              className={selectClass}
            >
              <option value="" disabled>
                Select category — unknown merchants require a choice
              </option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentName ? `${c.parentName} · ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Fund (optional)" htmlFor="fundId">
            <select
              id="fundId"
              name="fundId"
              defaultValue={suggestedFundId}
              className={selectClass}
            >
              <option value="">None</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Note (optional)" htmlFor="note">
            <textarea
              id="note"
              name="note"
              defaultValue={item.note ?? ""}
              className={textareaClass}
            />
          </FormField>

          <label className="flex items-start gap-3 rounded-xl bg-surface-tint p-3 text-xs text-muted-strong">
            <input
              type="checkbox"
              name="saveAsRule"
              defaultChecked={defaultRememberOn}
              className="mt-0.5 h-4 w-4 accent-[color:var(--accent-strong)]"
            />
            <span>
              Remember this rule — next time a merchant exactly matches, use the
              same category and fund.
            </span>
          </label>

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
            >
              Confirm
            </button>
            <Link
              href="/inbox"
              className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
            >
              Cancel
            </Link>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <form action={rejectPendingAction} className="flex items-center justify-between gap-3">
          <input type="hidden" name="transactionId" value={item.id} />
          <div className="min-w-0">
            <p className="text-sm font-medium">Reject this transaction</p>
            <p className="mt-0.5 text-[11px] text-muted">
              Keeps the record but excludes it from all reporting.
            </p>
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-surface-tint px-4 py-2 text-xs font-medium text-[color:var(--danger)]"
          >
            Reject
          </button>
        </form>
      </Card>
    </>
  );
}
