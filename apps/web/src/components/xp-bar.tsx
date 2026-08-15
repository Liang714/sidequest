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
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[28px] font-medium text-violet">{level}</span>
        <div>
          <div className="font-display text-[14px] font-semibold text-ink">{levelTitle}</div>
          {meta && <div className="text-[13px] text-ink-muted">{meta}</div>}
        </div>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-chip bg-surface-elevated">
        <div
          className="h-full rounded-chip shadow-glow-lime"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent-lime), color-mix(in srgb, var(--accent-lime) 70%, var(--accent-blue)))",
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
