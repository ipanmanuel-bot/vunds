import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAccountAction } from "@/app/accounts/actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getAccount } from "@/lib/accounts-data";
import { getFormOptions } from "@/lib/transactions-data";

// Short-TTL ISR: cached HTML served between regenerations. Mutations
// still invalidate immediately via revalidatePath in server actions, so
// users see fresh data after they save — the 30s is only a cap on how
// stale OTHER sessions could be.
export const revalidate = 30;

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [account, options] = await Promise.all([
    getAccount(id),
    getFormOptions(),
  ]);
  if (!account) notFound();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href={`/accounts/${id}`}
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />{" "}
            {account.name}
          </Link>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">
            Edit account
          </h1>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <AccountForm
            members={options.members}
            action={updateAccountAction}
            accountId={account.id}
            isEdit
            submitLabel="Save changes"
            cancelHref={`/accounts/${account.id}`}
            defaults={{
              name: account.name,
              type: account.type,
              ownerMemberId: account.ownerMemberId,
              // Prefill the "current balance" field with the computed value
              // — balance for debit/cash, outstanding for credit cards.
              currentBalance:
                account.type === "credit"
                  ? (account.outstanding ?? 0)
                  : (account.balance ?? 0),
              creditLimit: account.limit ?? null,
              externalIdentifier: account.externalIdentifier,
            }}
          />

          <Card className="p-5">
            <p className="text-sm font-semibold">Danger zone</p>
            <p className="mt-1 text-[11px] text-muted">
              Delete this account entirely. Only possible when no transactions
              reference it — otherwise archive instead.
            </p>
            <div className="mt-3">
              <DeleteAccountButton accountId={account.id} />
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
