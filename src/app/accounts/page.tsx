import { AccountSummaryCard } from "@/components/accounts/AccountSummaryCard";
import { listAccounts, type AccountSummary } from "@/lib/accounts-data";

export const dynamic = "force-dynamic";

const sections: Array<{ title: string; type: AccountSummary["type"] }> = [
  { title: "Debit", type: "debit" },
  { title: "Cash", type: "cash" },
  { title: "Credit cards", type: "credit" },
];

export default async function AccountsPage() {
  const accounts = await listAccounts();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <p className="text-xs text-muted">Household finance</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            Accounts
          </h1>
          <p className="mt-1 text-xs text-muted">
            Where your money physically sits or what you owe.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-6">
          {sections.map(({ title, type }) => {
            const items = accounts.filter((a) => a.type === type);
            if (items.length === 0) return null;
            return (
              <section key={type}>
                <h2 className="mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
                  {title}
                </h2>
                <div className="flex flex-col gap-3">
                  {items.map((a) => (
                    <AccountSummaryCard key={a.id} account={a} />
                  ))}
                </div>
              </section>
            );
          })}
        </main>
      </div>
    </div>
  );
}
