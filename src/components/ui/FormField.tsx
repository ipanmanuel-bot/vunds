import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="block text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </label>
  );
}

// text-base (16px) is intentional — anything smaller triggers iOS Safari's
// focus auto-zoom, which we disabled at the viewport level for a11y reasons.
const base =
  "block w-full rounded-xl bg-surface px-4 py-3 text-base text-foreground " +
  "shadow-[inset_0_0_0_1px_var(--border)] " +
  "placeholder:text-muted outline-none focus:shadow-[inset_0_0_0_2px_var(--accent-strong)]";

export const inputClass = base;
export const selectClass =
  `${base} appearance-none bg-[position:right_0.75rem_center] bg-no-repeat pr-10 ` +
  `bg-[length:1.25em_1.25em] ` +
  `bg-[image:url("data:image/svg+xml;charset=UTF-8,` +
  `%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%236b7470%27%20stroke-width%3D%271.6%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27M6%209l6%206%206-6%27%2F%3E%3C%2Fsvg%3E")]`;

export const textareaClass = `${base} min-h-[88px] resize-y`;
