"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useRouter } from "@/i18n/navigation";
import { planItineraryAction } from "@/app/actions/itinerary";
import { createQuestAction, joinQuestAction } from "@/app/actions/quests";
import { getAvailabilityAction, createBookingAction } from "@/app/actions/booking";
import { purchaseAiCreditsAction } from "@/app/actions/commerce";
import { Field, inputClass } from "./form-field";
import type { PlanStepOut } from "@sidequest/types";

type StepState = "idle" | "pending" | "done" | "error";

export function ItineraryPlannerClient({
  initialCoords,
}: {
  initialCoords?: { lat: number; lng: number } | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [freeText, setFreeText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [steps, setSteps] = useState<PlanStepOut[]>([]);
  const [stepStates, setStepStates] = useState<Record<number, StepState>>({});
  const [stepLinks, setStepLinks] = useState<Record<number, string>>({});
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [buyingCredits, startCreditsTransition] = useTransition();

  const plan = () => {
    if (!freeText.trim()) return;
    setError(null);
    setQuotaExceeded(false);
    setSteps([]);
    setStepStates({});
    setStepLinks({});
    startTransition(async () => {
      const result = await planItineraryAction(freeText.trim(), initialCoords ?? null);
      if (result.error || !result.plan) {
        setError(result.error ?? "Something went wrong.");
        setQuotaExceeded(!!result.quotaExceeded);
        return;
      }
      setSteps(result.plan.steps);
    });
  };

  const buyCredits = () => {
    startCreditsTransition(async () => {
      const result = await purchaseAiCreditsAction();
      if (!result.error) {
        setQuotaExceeded(false);
        setError(null);
      }
    });
  };

  const confirmStep = (index: number, step: PlanStepOut) => {
    setStepStates((prev) => ({ ...prev, [index]: "pending" }));
    setStepErrors((prev) => ({ ...prev, [index]: "" }));
    startTransition(async () => {
      try {
        if (step.type === "join_quest" && step.quest_id) {
          const result = await joinQuestAction(step.quest_id);
          if (result.error) throw new Error(result.error);
          setStepLinks((prev) => ({ ...prev, [index]: `/quests/${step.quest_id}` }));
        } else if (step.type === "create_quest") {
          const spot = initialCoords ?? { lat: 37.5665, lng: 126.978 };
          const result = await createQuestAction({
            title: step.title ?? "Untitled Quest",
            description: step.description ?? "",
            category_key: step.category_key ?? "category.random",
            location: { lat: spot.lat, lng: spot.lng, city: "Seoul", country: "KR" },
            start_time: step.suggested_start_time ?? new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            duration_minutes: step.duration_minutes ?? 90,
            budget_amount: step.budget_amount ?? null,
            max_participants: 4,
            difficulty: step.difficulty ?? "medium",
            xp_reward: step.xp_reward ?? 250,
            objectives: (step.objectives ?? []).map((description) => ({ description })),
          });
          if (result.error || !result.quest) throw new Error(result.error ?? "Failed to create quest");
          setStepLinks((prev) => ({ ...prev, [index]: `/quests/${result.quest!.id}` }));
        } else if (step.type === "book_activity" && step.activity_key) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
          const avail = await getAvailabilityAction(step.activity_key, dateStr, step.party_size ?? 2);
          if (avail.error || !avail.slots?.length) throw new Error(avail.error ?? "No slots available");
          const firstSlot = avail.slots[0]!;
          const booking = await createBookingAction({
            activity_key: step.activity_key,
            slot_ref: firstSlot.slot_ref,
            party_size: step.party_size ?? 2,
          });
          if (booking.error) throw new Error(booking.error);
          setStepLinks((prev) => ({ ...prev, [index]: "/bookings" }));
        }
        setStepStates((prev) => ({ ...prev, [index]: "done" }));
        router.refresh();
      } catch (err) {
        setStepStates((prev) => ({ ...prev, [index]: "error" }));
        setStepErrors((prev) => ({ ...prev, [index]: err instanceof Error ? err.message : "Failed" }));
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Field label={t("itinerary.fieldGoal")}>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder={t("itinerary.fieldGoalPlaceholder")}
          rows={3}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-[13px] text-coral">{error}</p>}
      {quotaExceeded && (
        <button
          type="button"
          disabled={buyingCredits}
          onClick={buyCredits}
          className="self-start rounded-button pressable border border-line bg-info px-3 py-1.5 font-mono text-[11.5px] font-medium text-on-info disabled:opacity-60"
        >
          {t("createQuest.aiBuyCredits")}
        </button>
      )}

      <button
        type="button"
        disabled={pending || !freeText.trim()}
        onClick={plan}
        className="rounded-button pressable border border-line bg-info py-3.5 font-display text-[14px] font-bold text-on-info disabled:opacity-60"
      >
        {pending && steps.length === 0 ? t("itinerary.planning") : t("itinerary.planIt")}
      </button>

      {steps.length > 0 && (
        <div className="flex flex-col gap-3">
          {steps.map((step, i) => {
            const state = stepStates[i] ?? "idle";
            return (
              <div key={i} className="rounded-card border border-line bg-surface p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-chip bg-violet-soft px-2 py-0.5 font-mono text-[10.5px] font-medium text-violet">
                    {t(`itinerary.stepType.${step.type}`)}
                  </span>
                  <span className="font-display text-[13.5px] font-semibold text-ink">
                    {step.type === "join_quest" && step.quest_title}
                    {step.type === "create_quest" && step.title}
                    {step.type === "book_activity" && t(`booking.activity.${step.activity_key}`)}
                  </span>
                </div>
                <p className="text-[12.5px] text-ink-muted">{step.reason}</p>
                {step.type === "create_quest" && step.description && (
                  <p className="mt-1 text-[12px] text-ink-faint">{step.description}</p>
                )}

                {state === "done" ? (
                  <a
                    href={stepLinks[i] ?? "#"}
                    className="mt-3 inline-block rounded-button bg-lime-soft px-3 py-1.5 font-display text-[12px] font-semibold text-lime"
                  >
                    {t("itinerary.viewResult")}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={state === "pending"}
                    onClick={() => confirmStep(i, step)}
                    className={clsx(
                      "pressable mt-3 w-full rounded-button border border-line py-2.5 font-display text-[12.5px] font-bold disabled:opacity-60",
                      "bg-hot text-on-hot",
                    )}
                  >
                    {state === "pending" ? t("common.loading") : t("itinerary.confirmStep")}
                  </button>
                )}
                {state === "error" && <p className="mt-2 text-[12px] text-coral">{stepErrors[i]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
