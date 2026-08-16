import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/app/actions/auth";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { TabBar } from "./tab-bar";

export async function AppShell({ children }: { children: ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
            <span className="h-[7px] w-[7px] rounded-full bg-lime shadow-glow-lime" />
            {t("app.name")}
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-chip border border-line px-2.5 py-1 font-mono text-[11px] text-ink-muted hover:text-ink"
              >
                {t("auth.logOut")}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>
      <TabBar />
    </div>
  );
}
