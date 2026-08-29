import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Bell, Search, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TabBar } from "./tab-bar";

/**
 * CREW app shell — spec §D.
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <Link href="/" className="text-h3 font-extrabold tracking-tight text-ink">
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
            <IconLink href="/search" label={t("nav.search")}>
              <Search aria-hidden className="h-[18px] w-[18px]" />
            </IconLink>

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
      // 40px box keeps the target near 44px around an 18px icon.
      className="relative flex h-10 w-10 items-center justify-center rounded-button text-ink-muted hover:text-ink"
    >
      {children}
      {badge > 0 && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-pill bg-hot ring-2 ring-bg" />
      )}
    </Link>
  );
}
