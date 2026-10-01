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

        {/* Order per product-spec hierarchy, adjusted for attention weight:
            Remaining budget is still the hero (#1 question of the dashboard),
            Money Inbox follows because pending items need review before they
            touch anything downstream. Spending comparison drops to last — it
            is useful historical context but needs no immediate action. */}
        <main className="mt-6 flex flex-col gap-5">
          <BudgetHero budget={data.budget} periodLabel={periodLabel} />
          <MoneyInbox pendingCount={data.pendingCount} />
          <AccountsRail accounts={data.accounts} />
          <FundList funds={data.funds} />
          <RecentTransactions items={data.recentTransactions} />
          <SpendingBars bars={data.spendingComparison} />
        </main>
      </div>
    </div>
  );
}
