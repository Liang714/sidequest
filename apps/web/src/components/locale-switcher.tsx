"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import clsx from "clsx";

const LOCALE_LABEL: Record<string, string> = { en: "EN", ko: "한국어" };

export function LocaleSwitcher() {
  const pathname = usePathname();
  const activeLocale = useLocale();

  return (
    <div className="flex gap-0.5 rounded-chip border border-line bg-surface-elevated p-0.5">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          className={clsx(
            "rounded-chip px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
            locale === activeLocale ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
          )}
        >
          {LOCALE_LABEL[locale]}
        </Link>
      ))}
    </div>
  );
}
