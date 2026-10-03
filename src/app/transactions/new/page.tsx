import Link from "next/link";

import { CreditCardPaymentForm } from "@/components/transactions/CreditCardPaymentForm";
import { ExpenseForm } from "@/components/transactions/ExpenseForm";
import { IncomeForm } from "@/components/transactions/IncomeForm";
import { NewTypePicker } from "@/components/transactions/NewTypePicker";
import { TransferForm } from "@/components/transactions/TransferForm";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getFormOptions } from "@/lib/transactions-data";

// Short-TTL ISR: cached HTML served between regenerations. Mutations
// still invalidate immediately via revalidatePath in server actions, so
// users see fresh data after they save — the 30s is only a cap on how
// stale OTHER sessions could be.
export const revalidate = 30;

const validTypes = [
  "expense",
  "income",
  "transfer",
  "credit_card_payment",
] as const;
type NewType = (typeof validTypes)[number];

function parseType(value: unknown): NewType | null {
  if (typeof value !== "string") return null;
  return (validTypes as readonly string[]).includes(value)
    ? (value as NewType)
    : null;
}

const titleFor: Record<NewType, string> = {
  expense: "New expense",
  income: "New income",
  transfer: "New transfer",
  credit_card_payment: "New credit card payment",
};

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const type = parseType(Array.isArray(sp.type) ? sp.type[0] : sp.type);

  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="flex items-center justify-between pt-6">
          <div>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-xs text-muted"
            >
              <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Transactions
            </Link>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
              {type ? titleFor[type] : "New transaction"}
            </h1>
          </div>
        </header>

        <main className="mt-5">
          {type ? (
            <TransactionForm type={type} defaultDate={defaultDate} />
          ) : (
            <NewTypePicker />
          )}
        </main>
      </div>
    </div>
  );
}

async function TransactionForm({
  type,
  defaultDate,
}: {
  type: NewType;
  defaultDate: string;
}) {
  const options = await getFormOptions();

  switch (type) {
    case "expense":
      return (
        <ExpenseForm
          accounts={options.accounts}
          categories={options.categories}
          funds={options.funds}
          defaultDate={defaultDate}
        />
      );
    case "income":
      return (
        <IncomeForm
          accounts={options.accounts}
          categories={options.categories}
          defaultDate={defaultDate}
        />
      );
    case "transfer":
      return (
        <TransferForm accounts={options.accounts} defaultDate={defaultDate} />
      );
    case "credit_card_payment":
      return (
        <CreditCardPaymentForm
          accounts={options.accounts}
          defaultDate={defaultDate}
        />
      );
  }
}
