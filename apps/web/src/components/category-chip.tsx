"use client";

import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { Check } from "lucide-react";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./category-icon";

/**
 * CREW filter chip. Selected state carries a check icon as well as the
 * fill — colour is never the sole signal (spec §K).
 */
export function CategoryChip({
  category,
  label,
  selected = false,
  as: Component = "span",
  className,
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
      aria-pressed={Component === "button" ? selected : undefined}
      className={clsx(
        "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-chip border px-3.5 text-caption",
        "transition-colors duration-150 ease-crew",
        selected
          ? "border-hot bg-hot font-bold text-on-hot"
          : "border-line bg-surface-elevated text-ink-muted hover:text-ink",
        className,
      )}
    >
      {selected ? (
        <Check aria-hidden className="h-[13px] w-[13px]" strokeWidth={3} />
      ) : (
        <CategoryIcon category={category} className="h-[15px] w-[15px]" />
      )}
      {label}
    </Component>
  );
}
