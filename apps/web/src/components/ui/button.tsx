import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

/**
 * Bold Pop Button — spec §2.4.
 *
 * Every filled variant is a black-outlined slab on a hard 3px shadow
 * (`.pressable` in globals.css): hover lifts it 1px, press pushes it flat
 * into the page in 90ms linear. `primary` is yellow with black ink (16:1);
 * `info` is the only white-text fill (blue, 5.1:1). Never put white on
 * yellow or pink — both fail.
 *
 * Loading holds the label in place (rendered invisible) so the button can't
 * change width mid-request and shift the layout under the user's thumb.
 */

export type ButtonVariant = "primary" | "secondary" | "info" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "pressable border border-line bg-hot text-on-hot",
  secondary: "pressable border border-line bg-surface text-ink",
  info: "pressable border border-line bg-info text-on-info",
  ghost: "bg-transparent text-ink underline-offset-4 hover:underline",
  danger: "pressable border border-line bg-surface text-danger-text hover:bg-danger-soft",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-body-s",
  md: "h-12 px-5 text-[14.5px]",
  lg: "h-[52px] px-6 text-body",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretches to the container. Sticky footers and card CTAs use this. */
  block?: boolean;
  loading?: boolean;
  /** Rendered before the label at 18px. Decorative — the label carries meaning. */
  icon?: ReactNode;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    block = false,
    loading = false,
    icon,
    children,
    className,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // A loading button must not be re-submittable, but it also must not
      // read as `disabled` to assistive tech — it's busy, not unavailable.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 rounded-button font-bold tracking-[-0.01em]",
        "disabled:pointer-events-none",
        // `disabled` and `loading` need different affordances: a disabled
        // button is unavailable, a loading one is working (full colour,
        // spinner, still on its shadow).
        //
        // Disabled loses its fill AND its shadow AND goes dashed — three
        // signals, so it can't be mistaken for "pressed" or for a secondary
        // button, and colour is never the only cue (spec §5.4).
        disabled && !loading
          ? variant === "ghost"
            ? clsx(VARIANTS.ghost, "opacity-40")
            : "border border-dashed border-ink-faint bg-surface-elevated text-ink-faint"
          : VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && (
        <Loader2 aria-hidden className="absolute h-[18px] w-[18px] animate-spin motion-reduce:animate-none" />
      )}
      <span className={clsx("inline-flex items-center gap-2", loading && "invisible")}>
        {icon}
        {children}
      </span>
    </button>
  );
});
