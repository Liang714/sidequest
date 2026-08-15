import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import type { Category } from "@/lib/types";
import { categoryEmoji } from "@/lib/types";

export function CategoryChip({
  category,
  label,
  selected = false,
  as: Component = "span",
  ...props
}: {
  category: Category;
  label: string;
  selected?: boolean;
  as?: "span" | "button";
} & ComponentPropsWithoutRef<"button">) {
  return (
    <Component
      {...props}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-chip border px-3.5 py-2 text-[13px] font-medium transition-colors",
        selected
          ? "border-blue/50 bg-blue-soft text-blue"
          : "border-line bg-surface text-ink-muted hover:text-ink",
      )}
    >
      <span>{categoryEmoji[category]}</span>
      {label}
    </Component>
  );
}
