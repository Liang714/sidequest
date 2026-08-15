import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
          </div>
        </div>
        <div className="mx-auto max-w-lg px-4 pb-2">
          <span className="rounded-chip border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
            {t("common.prototypeBadge")}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>
      <TabBar />
    </div>
  );
}
