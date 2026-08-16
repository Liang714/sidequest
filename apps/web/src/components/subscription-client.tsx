"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cancelSubscriptionAction, subscribeAction } from "@/app/actions/commerce";
import { formatQuestDate } from "@/lib/format";
import type { SubscriptionOut } from "@sidequest/types";

export function SubscriptionClient({ subscription }: { subscription: SubscriptionOut }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isPro = subscription.plan === "pro";

  const subscribe = () => {
    setError(null);
    startTransition(async () => {
      const result = await subscribeAction();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  const cancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-violet/30 bg-violet-soft p-5">
        <div className="flex items-center justify-between">
          <span className="font-display text-[16px] font-bold text-ink">
            {isPro ? t("subscription.proPlan") : t("subscription.freePlan")}
          </span>
          {isPro && (
            <span className="rounded-chip bg-lime-soft px-2.5 py-1 font-mono text-[11px] font-medium text-lime">
              {subscription.status === "canceled" ? t("subscription.statusCanceled") : t("subscription.statusActive")}
            </span>
          )}
        </div>
        {isPro && subscription.current_period_end && (
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            {subscription.status === "canceled"
              ? t("subscription.activeUntil", { date: formatQuestDate(subscription.current_period_end, locale) })
              : t("subscription.renewsOn", { date: formatQuestDate(subscription.current_period_end, locale) })}
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-[13px] font-semibold text-ink">{t("subscription.perksTitle")}</h2>
        <ul className="flex flex-col gap-2">
          {["unlimitedAi", "proBadge", "moreObjectives"].map((key) => (
            <li key={key} className="flex items-center gap-2 text-[13px] text-ink-muted">
              <span className="text-lime">✓</span>
              {t(`subscription.perk.${key}`)}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-[13px] text-coral">{error}</p>}

      {isPro ? (
        subscription.status === "active" && (
          <button
            type="button"
            disabled={pending}
            onClick={cancel}
            className="rounded-button border border-coral/40 py-3.5 font-display text-[14px] font-semibold text-coral disabled:opacity-60"
          >
            {t("subscription.cancel")}
          </button>
        )
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={subscribe}
          className="rounded-button bg-violet py-3.5 font-display text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? t("common.loading") : t("subscription.subscribeCta")}
        </button>
      )}
    </div>
  );
}
