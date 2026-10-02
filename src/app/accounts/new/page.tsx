import Link from "next/link";

import { AccountForm } from "@/components/accounts/AccountForm";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getFormOptions } from "@/lib/transactions-data";

export const dynamic = "force-dynamic";

export default async function NewAccountPage() {
  const options = await getFormOptions();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Accounts
          </Link>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">
            New account
          </h1>
          <p className="mt-1 text-xs text-muted">
            Where money sits (debit, cash) or what you owe (credit card).
          </p>
        </header>

        <main className="mt-5">
          <AccountForm members={options.members} />
        </main>
      </div>
    </div>
  );
}
