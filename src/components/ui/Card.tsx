import type { HTMLAttributes } from "react";

type Variant = "surface" | "tint";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  surface: "bg-surface",
  tint: "bg-surface-tint",
};

export function Card({
  variant = "surface",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`${variantClass[variant]} rounded-[var(--radius-card)] shadow-[0_1px_2px_rgba(15,42,31,0.04),0_8px_24px_-12px_rgba(15,42,31,0.08)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
