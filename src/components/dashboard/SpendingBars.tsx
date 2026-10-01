import { Card } from "@/components/ui/Card";
import type { SpendingBar } from "@/lib/dashboard-data";
import { formatRupiahCompact, monthShort } from "@/lib/format";

export function SpendingBars({ bars }: { bars: SpendingBar[] }) {
  const max = Math.max(...bars.map((b) => b.amount), 1);
  const barMinHeight = 8;
  const barMaxHeight = 112;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Spending comparison</h2>
        <span className="text-[11px] text-muted">Last 4 months</span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        {bars.map((b) => {
          const h =
            b.amount === 0
              ? barMinHeight
              : Math.max(
                  barMinHeight,
                  Math.round((b.amount / max) * barMaxHeight),
                );
          return (
            <div key={`${b.year}-${b.month}`} className="flex-1 text-center">
              <div
                className="text-[10px] font-medium tabular-nums text-muted"
                style={{ visibility: b.amount > 0 ? "visible" : "hidden" }}
              >
                {formatRupiahCompact(b.amount)}
              </div>
              <div
                className="mx-auto mt-1 w-full max-w-[48px] rounded-t-lg"
                style={{
                  height: `${h}px`,
                  background: b.isCurrent
                    ? "linear-gradient(180deg, #9ad4b0 0%, #4a9d6f 100%)"
                    : "var(--surface-tint)",
                }}
              />
              <div
                className={`mt-2 text-[11px] ${b.isCurrent ? "font-semibold text-foreground" : "text-muted"}`}
              >
                {monthShort(b.month)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
