import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-input border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint transition-[box-shadow,background-color] duration-fast ease-snap focus:bg-hot-soft focus:shadow-e1 aria-[invalid=true]:animate-shake aria-[invalid=true]:bg-danger-soft";

/*
 * Bold Pop input (spec §2.4): white field, 2px black outline. Focus fills it
 * pale yellow and drops it onto a hard shadow — a change in fill AND depth,
 * so focus never relies on a thin ring alone. aria-invalid shakes once and
 * tints red; the error text beside it carries the meaning.
 */

/**
 * `as="label"` (the default) only makes sense when the field wraps exactly
 * one native form control (input/textarea/select) — that's what makes
 * "click the label text to focus the field" work. Button-group fields
 * (category chips, difficulty, visibility) must pass `as="div"`: a
 * `<label>` wrapping several buttons isn't valid for multiple controls,
 * and browsers computed each button's accessible name by bleeding in the
 * label text and neighboring buttons' text — confusing for screen readers
 * and, is exactly what broke Playwright's role-based selectors in E2E
 * testing when this was caught.
 */
export function Field({
  label,
  children,
  as = "label",
}: {
  label: string;
  children: ReactNode;
  as?: "label" | "div";
}) {
  const Wrapper = as;
  return (
    <Wrapper className="flex flex-col gap-1.5">
      <span className="text-label uppercase text-ink">{label}</span>
      {children}
    </Wrapper>
  );
}
