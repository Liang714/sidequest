"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { explainRecommendationAction } from "@/app/actions/recommendation";

export function ExplainRecommendationButton({
  questId,
  coords,
}: {
  questId: string;
  coords?: { lat: number; lng: number } | null;
}) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const explain = () => {
    setError(null);
    startTransition(async () => {
      const result = await explainRecommendationAction(questId, coords ?? null);
      if (result.error) setError(result.error);
      else if (result.data) setExplanation(result.data.explanation);
    });
  };

  if (explanation) {
    return (
      <p className="mt-2 rounded-button border border-violet/30 bg-violet-soft px-3 py-2 text-[12.5px] text-ink">
        🤖 {explanation}
      </p>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={pending}
        onClick={explain}
        className="text-[12px] font-medium text-violet underline underline-offset-2 disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("itinerary.whyRecommended")}
      </button>
      {error && <p className="mt-1 text-[11.5px] text-coral">{error}</p>}
    </div>
  );
}
