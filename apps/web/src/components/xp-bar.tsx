import { getTranslations } from "next-intl/server";

export async function XpBar({
  level,
  levelTitle,
  currentXp,
  nextLevelXp,
  meta,
}: {
  level: number;
  levelTitle: string;
  currentXp: number;
  nextLevelXp: number;
  meta?: string;
}) {
  const t = await getTranslations();
  const pct = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-e1">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 -rotate-3 items-center justify-center rounded-button border border-line bg-hot text-[24px] font-bold tabular-nums text-on-hot shadow-e1">
          {level}
        </span>
        <div>
          <div className="font-display text-[14px] font-semibold text-ink">{levelTitle}</div>
          {meta && <div className="text-[13px] text-ink-muted">{meta}</div>}
        </div>
      </div>
      <div className="mt-4 h-4 overflow-hidden rounded-chip border border-line bg-surface">
        <div
          className="h-full border-line bg-pink transition-[width] duration-700 ease-pop motion-reduce:transition-none"
          style={{
            width: `${pct}%`,
            borderRightWidth: pct > 0 && pct < 100 ? 2 : 0,
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent 0 6px, rgba(0,0,0,0.12) 6px 12px)",
          }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[12px] text-ink-muted">
        <span>{t("profile.xpProgress", { current: currentXp.toLocaleString(), next: nextLevelXp.toLocaleString() })}</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}
