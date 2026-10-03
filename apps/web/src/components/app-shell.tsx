import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Bell, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TabBar } from "./tab-bar";

/**
 * Bold Pop app shell — spec §3.2.
 *
 * The header gains a notifications entry point, which the app has never had
 * despite GET /notifications shipping in the API (spec §A1 finding 1). The
 * screen itself lands in stage 4; the bell is wired to its route now so the
 * shell is complete and the destination is the only thing missing.
 *
 * Log out moved into Settings — it was occupying prime header real estate
 * for an action taken roughly once a month, which is exactly the sort of
 * thing that crowds out the ones taken every session.
 */

export interface AppShellProps {
  children: ReactNode;
  /** Mint dot on Rooms when a quest is live. */
  liveRoom?: boolean;
  /** Unread count for the bell. Only "needs you" + "starting soon" count,
   *  so ambient activity can never inflate it (spec §F6). */
  unreadCount?: number;
  aiRemaining?: number | null;
  isPro?: boolean;
}

export async function AppShell({
  children,
  liveRoom = false,
  unreadCount = 0,
  aiRemaining,
  isPro,
}: AppShellProps) {
  const t = await getTranslations();

  // No search entry point yet: there is no /search route and no quest
  // text-search endpoint (GET /quests has filters but no `q`). A header
  // link to a 404 is worse than no link — it lands with the endpoint.
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-20 border-b border-line bg-bg"
        // Named so it holds still during page transitions instead of fading.
        style={{ viewTransitionName: "app-header" }}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/"
            className="group inline-flex items-center rounded-button border border-line bg-hot px-2.5 py-1 text-h3 font-bold uppercase tracking-tight text-ink shadow-e1 transition-transform duration-fast ease-snap hover:-rotate-2"
          >
            {t("app.name")}
          </Link>

          {/*
            Language and theme moved to Settings → Preferences. Together with
            the three icon links they overflowed a 390px header by 86px and
            forced the whole page to scroll horizontally, which the spec's
            accessibility bar forbids outright. They're also settings, not
            per-session actions — the same reasoning that moved log out.
          */}
          <div className="flex items-center gap-1">
            <IconLink href="/notifications" label={t("nav.notifications")} badge={unreadCount}>
              <Bell aria-hidden className="h-[18px] w-[18px]" />
            </IconLink>

            <IconLink href="/settings" label={t("settings.navLink")}>
              <Settings aria-hidden className="h-[18px] w-[18px]" />
            </IconLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>

      <TabBar liveRoom={liveRoom} aiRemaining={aiRemaining} isPro={isPro} />
    </div>
  );
}

function IconLink({
  href,
  label,
  badge = 0,
  children,
}: {
  href: string;
  label: string;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={badge > 0 ? `${label} (${badge})` : label}
      // 44px box — the full touch target around an 18px icon.
      className="relative flex h-11 w-11 items-center justify-center rounded-button border border-transparent text-ink transition-colors duration-fast ease-snap hover:border-line hover:bg-surface"
    >
      {children}
      {badge > 0 && (
        <span className="absolute right-1 top-1 h-3 w-3 animate-pop-in rounded-pill border-2 border-line bg-pink" />
      )}
    </Link>
  );
}
