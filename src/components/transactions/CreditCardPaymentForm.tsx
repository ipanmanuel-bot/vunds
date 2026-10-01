import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { FormField, inputClass, selectClass, textareaClass } from "@/components/ui/FormField";
import { createCreditCardPaymentAction } from "@/app/transactions/actions";
import type { AccountOption } from "@/lib/transactions-data";

// CC payments deliberately expose NO category/fund fields. Paying down a card
// is not spending (docs/financial-logic.md §5). The action calls
// `createCreditCardPayment`, which can only ever produce a transaction of
// type 'credit_card_payment' — never an expense.
export function CreditCardPaymentForm({
  accounts,
  defaultDate,
}: {
  accounts: AccountOption[];
  defaultDate: string;
}) {
  const bankAccounts = accounts.filter((a) => a.type !== "credit");
  const creditCards = accounts.filter((a) => a.type === "credit");

  const noCards = creditCards.length === 0;
  const noBanks = bankAccounts.length === 0;

  return (
    <Card className="p-5">
      {noCards || noBanks ? (
        <p className="text-sm text-muted">
          {noCards
            ? "No credit card accounts configured — add one on the Accounts page first."
            : "No bank or cash account available to pay from."}
        </p>
      ) : (
        <form
          action={createCreditCardPaymentAction}
          className="flex flex-col gap-4"
        >
          <FormField label="Pay from account" htmlFor="fromAccountId">
            <select
              id="fromAccountId"
              name="fromAccountId"
              required
              defaultValue=""
              className={selectClass}
            >
              <option value="" disabled>
                Select bank or cash
              </option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Credit card" htmlFor="creditCardAccountId">
            <select
              id="creditCardAccountId"
              name="creditCardAccountId"
              required
              defaultValue=""
              className={selectClass}
            >
              <option value="" disabled>
                Select card
              </option>
              {creditCards.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Amount (IDR)" htmlFor="amount">
            <input
              id="amount"
              name="amount"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              required
              placeholder="0"
              className={inputClass}
            />
          </FormField>

          <FormField label="Date" htmlFor="transactionDate">
            <input
              id="transactionDate"
              name="transactionDate"
              type="date"
              required
              defaultValue={defaultDate}
              className={inputClass}
            />
          </FormField>

          <FormField label="Note (optional)" htmlFor="note">
            <textarea id="note" name="note" className={textareaClass} />
          </FormField>

          <p className="rounded-xl bg-surface-tint px-3 py-2 text-[11px] text-muted">
            Credit card payments reduce the card&rsquo;s outstanding balance.
            They are not counted as monthly expenses.
          </p>

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
            >
              Save payment
            </button>
            <Link
              href="/transactions"
              className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </Card>
  );
}
