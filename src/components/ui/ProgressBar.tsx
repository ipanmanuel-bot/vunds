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
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-tint">
      <div
        className={`h-full rounded-full ${fill} transition-[width] duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
