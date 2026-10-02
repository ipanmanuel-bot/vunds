import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAccountAction } from "@/app/accounts/actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getAccount } from "@/lib/accounts-data";
import { getFormOptions } from "@/lib/transactions-data";

export const dynamic = "force-dynamic";

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

        <main className="mt-5">
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
              openingBalance: account.openingBalance,
              creditLimit: account.limit ?? null,
              externalIdentifier: account.externalIdentifier,
            }}
          />
        </main>
      </div>
    </div>
  );
}
