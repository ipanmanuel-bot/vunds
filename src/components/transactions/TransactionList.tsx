import { Card } from "@/components/ui/Card";
import type { TransactionListItem as Item } from "@/lib/transactions-data";
import { formatShortDate } from "@/lib/format";
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
      {groups.map(({ date, items }) => (
        <section key={date}>
          <h3 className="mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
            {formatShortDate(new Date(`${date}T00:00:00.000Z`))}
          </h3>
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
      ))}
    </div>
  );
}
