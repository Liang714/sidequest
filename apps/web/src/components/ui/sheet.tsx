"use client";

import { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Sheet — spec §2.4. Bottom sheet on mobile, centred panel from 640px up.
 *
 * Motion (globals.css, keyed off `.sheet-panel`): on mobile it slides up in
 * 250ms snap; from 640px the centred panel pops in like a sticker. The
 * scrim fades in linearly. Both collapse under reduced motion.
 *
 * Built on native <dialog>.showModal() deliberately: it gives a real focus
 * trap, Escape handling, inertness of the background, and top-layer
 * stacking from the platform rather than from hand-rolled key handlers that
 * are easy to get subtly wrong. We add backdrop-click and focus restoration
 * on top.
 *
 * Everything that isn't a destructive confirmation is a sheet — Modal is
 * reserved for those (spec §H).
 */

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Announced as the dialog's accessible name. */
  title: string;
  /** Hide the visible heading while keeping the accessible name. */
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, hideTitle = false, children, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // <dialog> restores focus to the trigger on close in modern browsers, but
  // not reliably across all of them, so we capture it ourselves.
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open && !el.open) {
      restoreTo.current = document.activeElement as HTMLElement | null;
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fires for Escape as well as el.close() — the single close path.
    const onCancelOrClose = (e: Event) => {
      e.preventDefault();
      onClose();
      restoreTo.current?.focus?.();
    };
    el.addEventListener("cancel", onCancelOrClose);
    return () => el.removeEventListener("cancel", onCancelOrClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClick={(e) => {
        // Clicks land on the <dialog> itself only when they hit the backdrop;
        // anything inside the panel is caught by the inner div's stopPropagation.
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        "m-0 max-h-full w-full bg-transparent p-0 backdrop:bg-scrim",
        // bottom sheet on mobile, centred from sm up
        "mt-auto sm:m-auto sm:max-w-[440px]",
        className,
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sheet-panel rounded-t-sheet border border-b-0 border-line bg-surface p-5 sm:rounded-sheet sm:border-b sm:shadow-e3"
      >
        <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-pill bg-ink sm:hidden" />
        <h2 className={clsx("text-h1 text-ink", hideTitle && "sr-only")}>{title}</h2>
        <div className={clsx(!hideTitle && "mt-4")}>{children}</div>
      </div>
    </dialog>
  );
}
