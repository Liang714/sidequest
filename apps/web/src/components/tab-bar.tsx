"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import clsx from "clsx";

const TABS = [
  { href: "/", icon: "🧭", key: "discover" as const },
  { href: "/quests", icon: "⚔️", key: "quests" as const },
  { href: "/quests/new", icon: "+", key: "create" as const, center: true },
  { href: "/friends", icon: "👥", key: "friends" as const },
  { href: "/profile", icon: "👤", key: "profile" as const },
];

export function TabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-line bg-bg/85 backdrop-blur-md"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center gap-1 rounded-button px-3 py-1.5 font-mono text-[10px]",
                active ? "text-blue" : "text-ink-faint",
              )}
            >
              <span
                className={clsx(
                  "flex items-center justify-center text-[17px]",
                  tab.center &&
                    "h-9 w-9 rounded-full bg-blue text-[18px] text-white shadow-glow-blue",
                )}
              >
                {tab.icon}
              </span>
              {!tab.center && t(tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
