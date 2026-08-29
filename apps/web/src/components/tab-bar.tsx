"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Users, MessageCircle, Plus, CalendarDays, UserRound } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { CreateSheet } from "./create-sheet";

/**
 * CREW navigation — spec §D.
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
  /** Mint dot on Rooms when a quest is live right now. */
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
        className="sticky bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-md"
        // Safe-area padding so the bar clears the iOS home indicator.
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {left.map((tab) => (
            <Tab key={tab.href} {...tab} pathname={pathname} label={t(tab.labelKey)} dot={tab.labelKey === "rooms" && liveRoom} />
          ))}

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label={t("create")}
            className="-mt-2 flex h-11 w-11 items-center justify-center rounded-pill bg-hot text-on-hot transition-transform duration-150 ease-crew active:scale-[0.94]"
          >
            <Plus aria-hidden className="h-5 w-5" strokeWidth={2.5} />
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
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        // min-h-11 keeps the target at 44px even though the label is 11px.
        "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-button",
        active ? "text-hot-text" : "text-ink-faint",
      )}
    >
      <span className="relative">
        <Icon aria-hidden className="h-5 w-5" />
        {dot && (
          <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-pill bg-mint ring-2 ring-bg" />
        )}
      </span>
      <span className="text-label">{label}</span>
    </Link>
  );
}
