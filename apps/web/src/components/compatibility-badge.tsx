import { getTranslations } from "next-intl/server";
import type { CompatibilityBreakdownItem } from "@/lib/types";
import clsx from "clsx";

export async function CompatibilityBadge({
  score,
  breakdown,
  size = "lg",
}: {
  score: number;
  breakdown?: CompatibilityBreakdownItem[];
  size?: "sm" | "lg";
}) {
  const t = await getTranslations();
  const dimension = size === "lg" ? 128 : 56;

  return (
    <div className={clsx("flex flex-col items-center", size === "lg" && "text-center")}>
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: dimension,
          height: dimension,
          background: `conic-gradient(var(--accent-lime) calc(${score} * 1%), var(--surface-elevated) 0)`,
        }}
      >
        <div
          className="absolute rounded-full bg-surface"
          style={{ inset: size === "lg" ? 9 : 5 }}
        />
        <b
          className={clsx(
            "relative font-mono font-medium text-ink",
            size === "lg" ? "text-[26px]" : "text-[13px]",
          )}
        >
          {score}%
        </b>
      </div>
      {size === "lg" && (
        <>
          <div className="mt-3.5 text-[13px] font-semibold text-ink">{t("quest.compatibility")}</div>
          {breakdown && (
            <div className="mt-4 flex w-full flex-col gap-1.5 text-left">
              {breakdown.map((item) => (
                <div key={item.labelKey} className="flex justify-between text-[13px] text-ink-muted">
                  <span>{t(item.labelKey)}</span>
                  <b className="font-mono font-medium text-lime">+{item.points}</b>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
