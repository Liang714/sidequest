import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

/**
 * CREW Button — spec §H.
 *
 * `primary` is a tangerine FILL with near-black ink. White on #FF6A3D is
 * 2.5:1 and fails WCAG AA; `text-on-hot` is 6.7:1. Never override it.
 *
 * Loading holds the label in place (rendered invisible) so the button can't
 * change width mid-request and shift the layout under the user's thumb.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-hot text-on-hot",
  secondary: "bg-transparent text-ink border border-line hover:bg-surface-elevated",
  ghost: "bg-transparent text-ink-muted hover:text-ink",
  danger: "bg-transparent text-danger-text border border-danger-soft hover:bg-danger-soft",
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
        "relative inline-flex items-center justify-center gap-2 rounded-button font-bold",
        "transition-[transform,background-color,color] duration-150 ease-crew",
        "active:scale-[0.97] disabled:pointer-events-none",
        // `disabled` and `loading` need different affordances: a disabled
        // button is unavailable, a loading one is working (full opacity,
        // spinner).
        //
        // Dimming a tangerine fill to 40% produces a washed-out salmon that
        // reads as broken rather than unavailable, so a disabled primary
        // drops to a neutral surface instead. Other variants are already
        // low-contrast enough that opacity alone works.
        disabled && !loading
          ? variant === "primary"
            ? "bg-surface-elevated text-ink-faint"
            : clsx(VARIANTS[variant], "opacity-40")
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
