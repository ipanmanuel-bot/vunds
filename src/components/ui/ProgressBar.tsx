export function ProgressBar({
  percent,
  tone = "accent",
}: {
  percent: number; // 0-100
  tone?: "accent" | "warm" | "danger";
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill =
    tone === "accent"
      ? "bg-gradient-to-r from-[#9ad4b0] to-[#4a9d6f]"
      : tone === "warm"
        ? "bg-gradient-to-r from-[#f5d9b6] to-[#e9a76e]"
        : "bg-[color:var(--danger)]";
  // bg-foreground/10 = 10% opacity of the deep forest green. Visible on any
  // surface in the app (white cards, tinted sub-cards, warm-cream background)
  // without being heavy. Makes the full-bar extent obvious.
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
      <div
        className={`h-full rounded-full ${fill} transition-[width] duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
