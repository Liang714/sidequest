"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Users, MessageCircle, Plus, CalendarDays, UserRound } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { TransitionLink } from "./motion/transition-link";
import { CreateSheet } from "./create-sheet";

/**
 * Bold Pop navigation — spec §3.2, motion §4.2.
 *
 * The active tab sits on a yellow outlined pill. The pill carries a fixed
 * `view-transition-name`, so when a tab navigation runs through
 * TransitionLink the browser morphs the pill from the old tab to the new
 * one — a "tab morph" with no JS animation code. The bar itself is named
 * too, so it stays put instead of cross-fading with the page.
 *
 * Five tabs, and the two changes from the pre-rebuild bar are the whole
 * point of the IA fix:
 *
 *   Rooms earns a tab because in CREW the conversation IS the product. It
 *   used to be buried at /quests/[id]/room with no path to it at all.
 *
 *   The centre button opens a sheet rather than linking to the manual quest
 *   form, which is what finally makes /plan reachable.
 *
 * Friends moved under You; the time-critical half of social (requests,
 * invites) belongs in Notifications where it will actually be seen.
 *
 * Emoji icons are gone — they render inconsistently per platform and can't
 * take on state colour (spec §A1 finding 4).
 */

const TABS = [
  { href: "/", labelKey: "tonight", Icon: Users, exact: true },
  { href: "/rooms", labelKey: "rooms", Icon: MessageCircle },
  { href: "/plans", labelKey: "plans", Icon: CalendarDays },
  { href: "/profile", labelKey: "you", Icon: UserRound },
] as const;

export interface TabBarProps {
  /** Pink dot on Rooms when a quest is live right now. */
  liveRoom?: boolean;
  aiRemaining?: number | null;
  isPro?: boolean;
}

export function TabBar({ liveRoom = false, aiRemaining, isPro }: TabBarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [createOpen, setCreateOpen] = useState(false);

  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  return (
    <>
      <nav
        aria-label={t("primary")}
        className="sticky bottom-0 z-30 border-t border-line bg-surface"
        // Safe-area padding so the bar clears the iOS home indicator.
        style={{ paddingBottom: "env(safe-area-inset-bottom)", viewTransitionName: "tab-bar" }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {left.map((tab) => (
            <Tab key={tab.href} {...tab} pathname={pathname} label={t(tab.labelKey)} dot={tab.labelKey === "rooms" && liveRoom} />
          ))}

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label={t("create")}
            aria-expanded={createOpen}
            className="pressable group -mt-5 flex h-14 w-14 items-center justify-center rounded-pill border border-line bg-hot text-on-hot"
          >
            <Plus
              aria-hidden
              strokeWidth={3}
              className={clsx(
                "h-6 w-6 transition-transform duration-base ease-pop",
                createOpen ? "rotate-45" : "group-hover:rotate-90",
              )}
            />
          </button>

          {right.map((tab) => (
            <Tab key={tab.href} {...tab} pathname={pathname} label={t(tab.labelKey)} />
          ))}
        </div>
      </nav>

      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        aiRemaining={aiRemaining}
        isPro={isPro}
      />
    </>
  );
}

function Tab({
  href,
  Icon,
  label,
  pathname,
  exact = false,
  dot = false,
}: {
  href: string;
  Icon: typeof Users;
  label: string;
  pathname: string;
  /** Spread from TABS; unused here but present on the source objects. */
  labelKey?: string;
  exact?: boolean;
  dot?: boolean;
}) {
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <TransitionLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        // min-h-11 keeps the target at 44px even though the label is 11px.
        "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1",
        active ? "text-ink" : "text-ink-faint hover:text-ink",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-1 inset-y-0 rounded-button border border-line bg-hot"
          style={{ viewTransitionName: "tab-indicator" }}
        />
      )}
      <span className="relative">
        <Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
        {dot && (
          <span className="absolute -right-1.5 -top-1 h-3 w-3 animate-pop-in rounded-pill border-2 border-line bg-pink" />
        )}
      </span>
      <span className={clsx("relative text-label", active && "font-bold")}>{label}</span>
    </TransitionLink>
  );
}
