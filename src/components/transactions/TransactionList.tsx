import { Card } from "@/components/ui/Card";
import type { TransactionListItem as Item } from "@/lib/transactions-data";
import { formatRupiah, formatShortDate } from "@/lib/format";
import { TransactionListItem } from "./TransactionListItem";

function groupByDate(items: Item[]): Array<{ date: string; items: Item[] }> {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = item.date.toISOString().slice(0, 10);
    const arr = groups.get(key) ?? [];
    arr.push(item);
    groups.set(key, arr);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }));
}

// Net amount "spent" on a given day: confirmed expenses minus confirmed
// refunds (a refund received the same day reduces the day's net spend).
// Transfers, credit-card payments, fund allocations, and balance
// adjustments are NOT spending (per docs/financial-logic.md), so they're
// excluded from the sum — but still visible as individual rows.
function daySpent(items: Item[]): number {
  let total = 0;
  for (const it of items) {
    if (it.status !== "confirmed") continue;
    if (it.type === "expense") total += it.amount;
    else if (it.type === "refund") total -= it.amount;
  }
  return total;
}

export function TransactionList({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted">No transactions match these filters.</p>
      </Card>
    );
  }

  const groups = groupByDate(items);

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ date, items }) => {
        const spent = daySpent(items);
        return (
          <section key={date}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="text-[11px] font-medium tracking-wide text-muted uppercase">
                {formatShortDate(new Date(`${date}T00:00:00.000Z`))}
              </h3>
              {spent > 0 ? (
                <p className="text-[11px] font-medium tabular-nums text-muted-strong">
                  −{formatRupiah(spent)} spent
                </p>
              ) : null}
            </div>
            <Card className="p-5">
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <TransactionListItem item={item} />
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
