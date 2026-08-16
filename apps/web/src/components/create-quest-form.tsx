"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
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
import type { AiQuotaOut } from "@sidequest/types";

const CATEGORIES = Object.keys(categoryEmoji) as Category[];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "epic"];
const VISIBILITIES = ["public", "friends", "private"] as const;

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
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
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
        xp_reward: { easy: 150, medium: 250, hard: 350, epic: 500 }[difficulty],
        objectives: objectives.filter((o) => o.trim()).map((description) => ({ description })),
      });
      if (result.error) {
        setError(result.error);
      } else if (result.quest) {
        router.push(`/quests/${result.quest.id}`);
      }
    });
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="rounded-card border border-violet/30 bg-violet-soft p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="font-display text-[13px] font-semibold text-ink">{t("createQuest.aiTitle")}</p>
          {quota && (
            <span className="font-mono text-[11px] text-ink-faint">
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
            className={inputClass}
          />
          <button
            type="button"
            disabled={aiPending || !aiPrompt.trim()}
            onClick={generate}
            className="flex-none rounded-button bg-violet px-4 py-2.5 font-display text-[12.5px] font-semibold text-white disabled:opacity-60"
          >
            {aiPending ? t("createQuest.aiGenerating") : t("createQuest.aiGenerate")}
          </button>
        </div>
        {aiError && <p className="mt-2 text-[12px] text-coral">{aiError}</p>}
        {quotaExceeded && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={buyingCredits}
              onClick={buyCredits}
              className="rounded-button bg-violet px-3 py-1.5 font-mono text-[11.5px] font-medium text-white disabled:opacity-60"
            >
              {t("createQuest.aiBuyCredits")}
            </button>
            <Link href="/subscription" className="font-mono text-[11.5px] font-medium text-violet underline">
              {t("createQuest.aiUpgrade")}
            </Link>
          </div>
        )}
        {aiApplied && <p className="mt-2 text-[12px] text-lime">{t("createQuest.aiFilledIn")}</p>}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("createQuest.fieldDescriptionPlaceholder")}
          rows={3}
          className={inputClass}
        />
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

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("createQuest.fieldDate")}>
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("createQuest.fieldStartTime")}>
          <input
            required
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("createQuest.fieldDuration")}>
          <input
            type="number"
            min={15}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label={t("createQuest.fieldMaxParticipants")}>
          <input
            type="number"
            min={2}
            max={20}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("createQuest.fieldBudget")}>
        <input
          type="number"
          min={0}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="15000"
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

      <Field as="div" label={t("createQuest.fieldDifficulty")}>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={clsx(
                "flex-1 rounded-button border px-2 py-2.5 font-mono text-[12px] font-medium transition-colors",
                difficulty === d
                  ? "border-blue/50 bg-blue-soft text-blue"
                  : "border-line bg-surface text-ink-muted",
              )}
            >
              {t(`difficulty.${d}`)}
            </button>
          ))}
        </div>
      </Field>

      <Field as="div" label={t("createQuest.fieldVisibility")}>
        <div className="flex gap-2">
          {VISIBILITIES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={clsx(
                "flex-1 rounded-button border px-2 py-2.5 text-[12px] font-medium transition-colors",
                visibility === v
                  ? "border-blue/50 bg-blue-soft text-blue"
                  : "border-line bg-surface text-ink-muted",
              )}
            >
              {t(`quest.visibility.${v}`)}
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
                  onClick={() => setObjectives((prev) => prev.filter((_, idx) => idx !== i))}
                  className="rounded-button border border-line px-3 text-ink-faint"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setObjectives((prev) => [...prev, ""])}
            className="self-start text-[12px] font-medium text-blue"
          >
            + {t("createQuest.addObjective")}
          </button>
        </div>
      </Field>

      {error && <p className="text-[13px] text-coral">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-button bg-blue py-3.5 font-display text-[14px] font-semibold text-white shadow-glow-blue disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("createQuest.publish")}
      </button>
    </form>
  );
}
