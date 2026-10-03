"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  startTransition,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

/**
 * Shared-element page transitions on the View Transitions API — spec §4.2.
 *
 * `document.startViewTransition` snapshots the old page, runs our callback,
 * and animates to the new DOM once the callback's promise resolves. Next's
 * router has no "navigation committed" promise, so the provider resolves it
 * itself when `usePathname()` changes — i.e. after the new route has
 * rendered. Any element with a matching `view-transition-name` on both pages
 * (a quest card and the detail header, the active-tab pill) morphs between
 * its two positions; everything else cross-fades (globals.css).
 *
 * Falls back to a plain navigation when the API is missing (Firefox <144,
 * older Safari), the user prefers reduced motion, or the click is one the
 * browser should handle itself (new tab, modifier keys).
 */

type Navigate = (href: string) => void;

const TransitionContext = createContext<Navigate | null>(null);

/**
 * How long the old page may stay frozen waiting for the new route. The
 * screen is a static snapshot during the wait, so past this we let the
 * transition finish as a no-op and the route lands without animation —
 * a slow network must never feel like a hung app.
 */
const MAX_WAIT_MS = 1200;

export function ViewTransitions({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pending = useRef<(() => void) | null>(null);

  // Layout effect: runs after the new route's DOM is committed but before
  // paint, which is exactly when the transition should capture "new".
  useLayoutEffect(() => {
    pending.current?.();
    pending.current = null;
  }, [pathname]);

  const navigate = useCallback<Navigate>(
    (href) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!document.startViewTransition || reduce) {
        router.push(href);
        return;
      }
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, MAX_WAIT_MS);
            pending.current = () => {
              window.clearTimeout(timer);
              resolve();
            };
            startTransition(() => router.push(href));
          }),
      );
    },
    [router],
  );

  return <TransitionContext.Provider value={navigate}>{children}</TransitionContext.Provider>;
}

/** Imperative version, for buttons that navigate after an action. */
export function useTransitionNavigate(): Navigate {
  const router = useRouter();
  return useContext(TransitionContext) ?? ((href) => router.push(href));
}

type LinkProps = ComponentProps<typeof Link>;

/** Drop-in for the i18n `Link` that animates the navigation. String hrefs only. */
export function TransitionLink({ href, onClick, ...rest }: LinkProps & { href: string }) {
  const navigate = useContext(TransitionContext);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (
      !navigate ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      rest.target === "_blank"
    ) {
      return;
    }
    e.preventDefault();
    navigate(href);
  }

  return <Link href={href} onClick={handleClick} {...rest} />;
}

/**
 * `view-transition-name` values must be valid CSS idents and unique on the
 * page. Quest ids are UUIDs, which can start with a digit, hence the prefix.
 */
export function vtName(kind: string, id: string): string {
  return `${kind}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
