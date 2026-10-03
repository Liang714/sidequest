"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { categoryEmoji, type Category, type Difficulty } from "@/lib/types";
import { categoryShortKey } from "@/lib/format";
import { SEOUL_NEIGHBORHOODS } from "@/lib/seoul-neighborhoods";
import { createQuestAction } from "@/app/actions/quests";
import { generateQuestDraftAction, getAiQuotaAction } from "@/app/actions/ai";
import { purchaseAiCreditsAction } from "@/app/actions/commerce";
import { Link } from "@/i18n/navigation";
import { CategoryChip } from "./category-chip";
import { Field, inputClass } from "./form-field";
import { Button } from "@/components/ui";
import { QuestCardView } from "./quest-card-view";
import type { AiQuotaOut } from "@sidequest/types";

const CATEGORIES = Object.keys(categoryEmoji) as Category[];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "epic"];
const VISIBILITIES = ["public", "friends", "private"] as const;
const XP_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 150, medium: 250, hard: 350, epic: 500 };


/** Local calendar date — not toISOString(), which shifts near midnight. */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The next round hour, which is what "tonight" almost always means. */
function nextRoundHour(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, "0")}:00`;
}

export function CreateQuestForm({
  initialCoords,
  initialQuota,
}: {
  initialCoords?: { lat: number; lng: number } | null;
  initialQuota?: AiQuotaOut | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPending, startAiTransition] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [quota, setQuota] = useState<AiQuotaOut | null | undefined>(initialQuota);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [buyingCredits, startCreditsTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(SEOUL_NEIGHBORHOODS[0].label);
  // Aggressive defaults so a valid quest is one tap from step 1 to publish
  // (spec §F5). Built from local Y/M/D and the next round hour — never
  // toISOString(), which converts to UTC first and can silently shift the
  // calendar date near midnight.
  const [date, setDate] = useState(todayLocal);
  const [startTime, setStartTime] = useState(nextRoundHour);
  const [duration, setDuration] = useState(90);
  const [budget, setBudget] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [category, setCategory] = useState<Category>("random");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>("public");
  const [objectives, setObjectives] = useState<string[]>([""]);

  const setObjective = (i: number, value: string) =>
    setObjectives((prev) => prev.map((o, idx) => (idx === i ? value : o)));

  const generate = () => {
    if (!aiPrompt.trim()) return;
    setAiError(null);
    setAiApplied(false);
    setQuotaExceeded(false);
    startAiTransition(async () => {
      const result = await generateQuestDraftAction(aiPrompt.trim(), initialCoords ?? null);
      if (result.error || !result.draft) {
        setAiError(result.error ?? "Something went wrong.");
        setQuotaExceeded(!!result.quotaExceeded);
        return;
      }
      const draft = result.draft;
      setTitle(draft.title);
      setDescription(draft.description);
      const shortCategory = categoryShortKey(draft.category_key);
      if (CATEGORIES.includes(shortCategory)) setCategory(shortCategory);
      if (DIFFICULTIES.includes(draft.difficulty as Difficulty)) setDifficulty(draft.difficulty as Difficulty);
      setDuration(draft.duration_minutes);
      setBudget(draft.budget_amount ? String(draft.budget_amount) : "");
      setObjectives(draft.objectives.length > 0 ? draft.objectives : [""]);
      setAiApplied(true);
      setQuota(await getAiQuotaAction());
    });
  };

  const buyCredits = () => {
    startCreditsTransition(async () => {
      const result = await purchaseAiCreditsAction();
      if (!result.error && result.data) {
        setQuota(result.data);
        setQuotaExceeded(false);
        setAiError(null);
      }
    });
  };

  const submit = () => {
    setError(null);
    const spot = SEOUL_NEIGHBORHOODS.find((n) => n.label === neighborhood) ?? SEOUL_NEIGHBORHOODS[0];
    const startIso = date && startTime ? `${date}T${startTime}:00+09:00` : "";

    startTransition(async () => {
      const result = await createQuestAction({
        title,
        description,
        category_key: `category.${category}`,
        location: { lat: spot.lat, lng: spot.lng, city: "Seoul", country: "KR", place_name: spot.label },
        start_time: startIso,
        duration_minutes: duration,
        budget_amount: budget ? Number(budget) : null,
        max_participants: maxParticipants,
        difficulty,
        visibility,
        xp_reward: XP_BY_DIFFICULTY[difficulty],
        objectives: objectives.filter((o) => o.trim()).map((description) => ({ description })),
      });
      if (result.error) {
        setError(result.error);
      } else if (result.quest) {
        router.push(`/quests/${result.quest.id}`);
      }
    });
  };

  // Description is required server-side (min_length=1). Gating step 1 on it
  // means the user finds out where the field is, not three steps later at
  // publish — where the failure previously surfaced as a raw Pydantic
  // string ("String should have at least 1 character") after all the work
  // was already done.
  const canNext = [
    title.trim().length > 0 && description.trim().length > 0,
    !!date && !!startTime,
    true,
  ][step];
  const spot = SEOUL_NEIGHBORHOODS.find((n) => n.label === neighborhood) ?? SEOUL_NEIGHBORHOODS[0];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 2) {
          if (canNext) setStep((v) => v + 1);
          return;
        }
        submit();
      }}
    >
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={clsx(
              "h-2.5 flex-1 rounded-pill border border-line transition-colors duration-base ease-snap",
              i <= step ? "bg-hot" : "bg-surface",
            )}
          />
        ))}
      </div>

      {/* ---------- Step 1: what & where ---------- */}
      {step === 0 && (
        <>
          <div className="rounded-card border border-line bg-info-soft p-4">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-h3 text-ink">
                <Sparkles aria-hidden className="h-4 w-4 text-info-text" />
                {t("createQuest.aiTitle")}
              </p>
              {quota && (
                <span className="text-caption tabular-nums text-ink-faint">
                  {quota.is_pro
                    ? t("createQuest.aiQuotaPro")
                    : t("createQuest.aiQuotaFree", {
                        remaining: Math.max(quota.daily_limit - quota.used_today, 0),
                        total: quota.daily_limit,
                      })}
                  {!quota.is_pro && quota.credits_remaining > 0 && (
                    <> · {t("createQuest.aiCreditsRemaining", { count: quota.credits_remaining })}</>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t("createQuest.aiPromptPlaceholder")}
                aria-label={t("createQuest.aiTitle")}
                className={inputClass}
              />
              <Button
                type="button"
                size="md"
                className="flex-none"
                loading={aiPending}
                disabled={!aiPrompt.trim()}
                onClick={generate}
              >
                {t("createQuest.aiGenerate")}
              </Button>
            </div>
            {aiError && (
              <p role="alert" className="mt-2 text-caption text-danger-text">
                {aiError}
              </p>
            )}
            {quotaExceeded && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" loading={buyingCredits} onClick={buyCredits}>
                  {t("createQuest.aiBuyCredits")}
                </Button>
                <Link href="/subscription" className="text-caption font-bold text-info-text underline">
                  {t("createQuest.aiUpgrade")}
                </Link>
              </div>
            )}
            {aiApplied && (
              <p className="mt-2 text-caption font-semibold text-pink-text">
                {t("createQuest.aiFilledIn")}
              </p>
            )}
          </div>

          <Field label={t("createQuest.fieldTitle")}>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("createQuest.fieldTitlePlaceholder")}
              className={inputClass}
            />
          </Field>

          <Field label={t("createQuest.fieldDescription")}>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createQuest.fieldDescriptionPlaceholder")}
              rows={3}
              className={inputClass}
            />
          </Field>

          <Field as="div" label={t("createQuest.fieldCategory")}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <CategoryChip
                  key={c}
                  as="button"
                  type="button"
                  category={c}
                  label={t(`category.${c}`)}
                  selected={category === c}
                  onClick={() => setCategory(c)}
                />
              ))}
            </div>
          </Field>

          <Field label={t("createQuest.fieldLocation")}>
            <select
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className={inputClass}
            >
              {SEOUL_NEIGHBORHOODS.map((n) => (
                <option key={n.label} value={n.label}>
                  {n.label}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      {/* ---------- Step 2: when & who ---------- */}
      {step === 1 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("createQuest.fieldDate")}>
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label={t("createQuest.fieldStartTime")}>
              <input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("createQuest.fieldDuration")}>
              <input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputClass} />
            </Field>
            <Field label={t("createQuest.fieldMaxParticipants")}>
              <input type="number" min={2} max={20} value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} className={inputClass} />
            </Field>
          </div>

          <Field label={t("createQuest.fieldBudget")}>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={t("createQuest.budgetFree")}
              className={inputClass}
            />
          </Field>

          <Field as="div" label={t("createQuest.fieldDifficulty")}>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  className={clsx(
                    "min-h-11 flex-1 rounded-button border px-2 text-caption font-semibold transition-colors duration-150 ease-snap",
                    difficulty === d ? "border-line bg-hot text-on-hot shadow-e1" : "border-line bg-surface text-ink-muted",
                  )}
                >
                  {t(`difficulty.${d}`)}
                </button>
              ))}
            </div>
          </Field>

          <Field as="div" label={t("quest.objectives")}>
            <div className="flex flex-col gap-2">
              {objectives.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={o}
                    onChange={(e) => setObjective(i, e.target.value)}
                    placeholder={`${t("quest.objectives")} ${i + 1}`}
                    className={inputClass}
                  />
                  {objectives.length > 1 && (
                    <button
                      type="button"
                      aria-label={t("common.remove")}
                      onClick={() => setObjectives((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex min-h-11 w-11 items-center justify-center rounded-button border border-line text-ink-faint"
                    >
                      <X aria-hidden className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setObjectives((prev) => [...prev, ""])}
                className="self-start text-caption font-bold text-hot-text"
              >
                + {t("createQuest.addObjective")}
              </button>
            </div>
          </Field>
        </>
      )}

      {/* ---------- Step 3: review & publish ---------- */}
      {step === 2 && (
        <>
          <div>
            <p className="mb-2 text-label uppercase text-ink-faint">{t("createQuest.previewLabel")}</p>
            {/* The real feed card, not an approximation — QuestCardView is
                the same component the feed renders (spec §F5). */}
            <QuestCardView
              category={category}
              categoryLabel={t(`category.${category}`)}
              meta={
                <span className="text-caption tabular-nums text-ink-faint">
                  {t("quest.spotsLeft", { count: maxParticipants })}
                </span>
              }
              people={[]}
              title={title || t("createQuest.fieldTitlePlaceholder")}
              place={spot.label}
              budgetLabel={budget ? `₩${Number(budget).toLocaleString()}` : t("createQuest.budgetFree")}
              startLabel={startTime ? `${date} · ${startTime}` : ""}
              xpLabel={t("quest.xpReward", { xp: XP_BY_DIFFICULTY[difficulty] })}
            />
            <p className="mt-2 text-caption text-ink-faint">{t("createQuest.previewHint")}</p>
          </div>

          <Field as="div" label={t("createQuest.fieldVisibility")}>
            <div className="flex gap-2">
              {VISIBILITIES.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={visibility === v}
                  onClick={() => setVisibility(v)}
                  className={clsx(
                    "min-h-11 flex-1 rounded-button border px-2 text-caption font-semibold transition-colors duration-150 ease-snap",
                    visibility === v ? "border-line bg-hot text-on-hot shadow-e1" : "border-line bg-surface text-ink-muted",
                  )}
                >
                  {t(`quest.visibility.${v}`)}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      {error && (
        <p role="alert" className="text-body-s text-danger-text">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        {step > 0 && (
          <Button type="button" variant="secondary" size="lg" onClick={() => setStep((v) => v - 1)}>
            {t("onboarding.back")}
          </Button>
        )}
        {step < 2 ? (
          <Button type="submit" block size="lg" disabled={!canNext}>
            {t("onboarding.next")}
          </Button>
        ) : (
          <Button type="submit" block size="lg" loading={pending}>
            {t("createQuest.publish")}
          </Button>
        )}
      </div>
    </form>
  );
}
