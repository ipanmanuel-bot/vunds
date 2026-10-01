import { AccountsRail } from "@/components/dashboard/AccountsRail";
import { BudgetHero } from "@/components/dashboard/BudgetHero";
import { FundList } from "@/components/dashboard/FundList";
import { Greeting } from "@/components/dashboard/Greeting";
import { MoneyInbox } from "@/components/dashboard/MoneyInbox";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { SpendingBars } from "@/components/dashboard/SpendingBars";
import { loadDashboard } from "@/lib/dashboard-data";
import { monthName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await loadDashboard();
  const periodLabel = `${monthName(data.period.month)} ${data.period.year}`;

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <Greeting
          displayName={data.viewer.displayName}
          periodLabel={periodLabel}
        />

        <main className="mt-6 flex flex-col gap-5">
          <BudgetHero budget={data.budget} periodLabel={periodLabel} />
          <SpendingBars bars={data.spendingComparison} />
          <AccountsRail accounts={data.accounts} />
          <FundList funds={data.funds} />
          <RecentTransactions items={data.recentTransactions} />
          <MoneyInbox pendingCount={data.pendingCount} />
        </main>
      </div>
    </div>
  );
}
