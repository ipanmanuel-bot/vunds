import { FundSummaryCard } from "@/components/funds/FundSummaryCard";
import { listFunds } from "@/lib/funds-data";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const funds = await listFunds();

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <p className="text-xs text-muted">Household finance</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            Goals
          </h1>
          <p className="mt-1 text-xs text-muted">
            Funds are virtual allocations — they describe what money is intended
            for, not where it physically lives.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-3">
          {funds.length === 0 ? (
            <p className="text-sm text-muted">No funds yet.</p>
          ) : (
            funds.map((f) => <FundSummaryCard key={f.id} fund={f} />)
          )}
        </main>
      </div>
    </div>
  );
}
