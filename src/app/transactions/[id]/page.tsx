import Link from "next/link";
import { notFound } from "next/navigation";

import {
  rejectTransactionAction,
  updateCreditCardPaymentAction,
  updateExpenseAction,
  updateIncomeAction,
  updateTransferAction,
} from "@/app/transactions/actions";
import { CreditCardPaymentForm } from "@/components/transactions/CreditCardPaymentForm";
import { ExpenseForm } from "@/components/transactions/ExpenseForm";
import { IncomeForm } from "@/components/transactions/IncomeForm";
import { TransferForm } from "@/components/transactions/TransferForm";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatRupiah, formatShortDate } from "@/lib/format";
import type { TransactionType } from "@/lib/finance";
import {
  getTransaction,
  getFormOptions,
  type TransactionDetail,
} from "@/lib/transactions-data";

export const dynamic = "force-dynamic";

const typeLabel: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  credit_card_payment: "Credit card payment",
  fund_allocation: "Fund allocation",
  refund: "Refund",
  adjustment_increase: "Balance adjustment",
  adjustment_decrease: "Balance adjustment",
};

const amountSign: Record<TransactionType, "+" | "-" | ""> = {
  income: "+",
  refund: "+",
  expense: "-",
  transfer: "",
  credit_card_payment: "",
  fund_allocation: "",
  adjustment_increase: "+",
  adjustment_decrease: "-",
};

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tx, options] = await Promise.all([getTransaction(id), getFormOptions()]);
  if (!tx) notFound();

  const isoDate = tx.date.toISOString().slice(0, 10);
  const isPending = tx.status === "pending";

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Transactions
          </Link>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          {/* Hero */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <Pill tone="muted">{typeLabel[tx.type]}</Pill>
              {tx.status !== "confirmed" ? (
                <Pill tone={isPending ? "warm" : "muted"}>{tx.status}</Pill>
              ) : null}
            </div>
            <p className="mt-4 text-[36px] leading-none font-semibold tracking-tight tabular-nums">
              {amountSign[tx.type]}
              {formatRupiah(tx.amount)}
            </p>
            <p className="mt-2 text-sm text-muted">
              {formatShortDate(tx.date)}
            </p>

            {isPending ? (
              <p className="mt-4 rounded-xl bg-surface-tint px-3 py-2 text-[11px] text-muted-strong">
                Pending means this was imported but not yet reviewed. It is{" "}
                <strong>not</strong> counted toward budgets, balances, or
                reports until you confirm it. Edit the fields below and press
                Confirm to accept, or Reject to discard.
              </p>
            ) : null}

            {tx.refundOfId ? (
              <p className="mt-3 text-[11px] text-muted">
                Refund of{" "}
                <Link
                  href={`/transactions/${tx.refundOfId}`}
                  className="text-accent-strong hover:underline"
                >
                  {tx.refundOfMerchant ?? "original expense"}
                </Link>
                .
              </p>
            ) : null}
            {tx.createdByName ? (
              <p className="mt-1 text-[11px] text-muted">
                Entered by {tx.createdByName}.
              </p>
            ) : null}
          </Card>

          {/* Edit form (per type) */}
          <EditForm
            tx={tx}
            isoDate={isoDate}
            accounts={options.accounts}
            categories={options.categories}
            funds={options.funds}
          />
        </main>
      </div>
    </div>
  );
}

function EditForm({
  tx,
  isoDate,
  accounts,
  categories,
  funds,
}: {
  tx: TransactionDetail;
  isoDate: string;
  accounts: Awaited<ReturnType<typeof getFormOptions>>["accounts"];
  categories: Awaited<ReturnType<typeof getFormOptions>>["categories"];
  funds: Awaited<ReturnType<typeof getFormOptions>>["funds"];
}) {
  const isPending = tx.status === "pending";
  const submitLabel = isPending ? "Confirm" : "Save changes";
  const pendingSlot = isPending ? <RejectRow id={tx.id} /> : null;

  // Pending transactions carry `intent=confirm` so the server action knows
  // to promote status from pending → confirmed on save.
  const confirmButton = isPending ? (
    <input type="hidden" name="intent" value="confirm" />
  ) : null;

  switch (tx.type) {
    case "expense":
      return (
        <ExpenseForm
          accounts={accounts}
          categories={categories}
          funds={funds}
          defaultDate={isoDate}
          defaults={{
            amount: tx.amount,
            accountId: tx.accountId ?? undefined,
            categoryId: tx.categoryId ?? undefined,
            fundId: tx.fundId ?? undefined,
            merchant: tx.merchant ?? undefined,
            note: tx.note ?? undefined,
          }}
          action={async (fd) => {
            "use server";
            if (isPending) fd.set("intent", "confirm");
            await updateExpenseAction(fd);
          }}
          transactionId={tx.id}
          submitLabel={submitLabel}
          cancelHref="/transactions"
          extraPendingSlot={pendingSlot}
        />
      );
    case "income":
      return (
        <IncomeForm
          accounts={accounts}
          categories={categories}
          defaultDate={isoDate}
          defaults={{
            amount: tx.amount,
            accountId: tx.accountId ?? undefined,
            categoryId: tx.categoryId ?? undefined,
            note: tx.note ?? undefined,
          }}
          action={async (fd) => {
            "use server";
            if (isPending) fd.set("intent", "confirm");
            await updateIncomeAction(fd);
          }}
          transactionId={tx.id}
          submitLabel={submitLabel}
          cancelHref="/transactions"
          extraPendingSlot={pendingSlot}
        />
      );
    case "transfer":
      return (
        <TransferForm
          accounts={accounts}
          defaultDate={isoDate}
          defaults={{
            amount: tx.amount,
            fromAccountId: tx.accountId ?? undefined,
            toAccountId: tx.counterAccountId ?? undefined,
            note: tx.note ?? undefined,
          }}
          action={async (fd) => {
            "use server";
            if (isPending) fd.set("intent", "confirm");
            await updateTransferAction(fd);
          }}
          transactionId={tx.id}
          submitLabel={submitLabel}
          cancelHref="/transactions"
          extraPendingSlot={pendingSlot}
        />
      );
    case "credit_card_payment":
      return (
        <CreditCardPaymentForm
          accounts={accounts}
          defaultDate={isoDate}
          defaults={{
            amount: tx.amount,
            fromAccountId: tx.accountId ?? undefined,
            creditCardAccountId: tx.counterAccountId ?? undefined,
            note: tx.note ?? undefined,
          }}
          action={async (fd) => {
            "use server";
            if (isPending) fd.set("intent", "confirm");
            await updateCreditCardPaymentAction(fd);
          }}
          transactionId={tx.id}
          submitLabel={submitLabel}
          cancelHref="/transactions"
          extraPendingSlot={pendingSlot}
        />
      );
    // Refunds and fund allocations are read-only in the UI for now — the
    // user said "all transaction items" but we don't yet have create flows
    // for these two types, so editing them is Phase 8+.
    default:
      return <ReadOnlyNotice tx={tx} />;
  }

  void confirmButton;
}

function RejectRow({ id }: { id: string }) {
  return (
    <form
      action={rejectTransactionAction}
      className="mt-3 flex items-center justify-between rounded-xl bg-surface-tint p-3"
    >
      <input type="hidden" name="transactionId" value={id} />
      <div>
        <p className="text-xs font-medium">Reject this transaction</p>
        <p className="mt-0.5 text-[11px] text-muted">
          Keeps the record but excludes it from all reporting.
        </p>
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-surface px-4 py-2 text-xs font-medium text-[color:var(--danger)]"
      >
        Reject
      </button>
    </form>
  );
}

function ReadOnlyNotice({ tx }: { tx: TransactionDetail }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-strong">
        Editing {typeLabel[tx.type].toLowerCase()} transactions is not
        implemented yet. For now you can view the details above.
      </p>
      <dl className="mt-4 divide-y divide-border">
        {tx.accountName ? (
          <Row label="Account" value={tx.accountName} />
        ) : null}
        {tx.counterAccountName ? (
          <Row label="Counter account" value={tx.counterAccountName} />
        ) : null}
        {tx.fundName ? <Row label="Fund" value={tx.fundName} /> : null}
        {tx.counterFundName ? (
          <Row label="To fund" value={tx.counterFundName} />
        ) : null}
        {tx.note ? <Row label="Note" value={tx.note} /> : null}
      </dl>
    </Card>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
