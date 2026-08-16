import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-button border border-line bg-surface-elevated px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-blue";

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
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
      {children}
    </Wrapper>
  );
}
