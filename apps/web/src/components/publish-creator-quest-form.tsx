"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useRouter } from "@/i18n/navigation";
import { categoryEmoji, type Category, type Difficulty } from "@/lib/types";
import { SEOUL_NEIGHBORHOODS } from "@/lib/seoul-neighborhoods";
import { publishCreatorQuestAction } from "@/app/actions/commerce";
import { CategoryChip } from "./category-chip";
import { Field, inputClass } from "./form-field";

const CATEGORIES = Object.keys(categoryEmoji) as Category[];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "epic"];

export function PublishCreatorQuestForm() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(SEOUL_NEIGHBORHOODS[0].label);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(120);
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [category, setCategory] = useState<Category>("exploration");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [price, setPrice] = useState("5000");

  const submit = () => {
    setError(null);
    const spot = SEOUL_NEIGHBORHOODS.find((n) => n.label === neighborhood) ?? SEOUL_NEIGHBORHOODS[0];
    const startIso = date && startTime ? `${date}T${startTime}:00+09:00` : "";

    startTransition(async () => {
      const result = await publishCreatorQuestAction({
        quest: {
          title,
          description,
          category_key: `category.${category}`,
          location: { lat: spot.lat, lng: spot.lng, city: "Seoul", country: "KR", place_name: spot.label },
          start_time: startIso,
          duration_minutes: duration,
          max_participants: maxParticipants,
          difficulty,
          xp_reward: { easy: 150, medium: 250, hard: 350, epic: 500 }[difficulty],
          objectives: [],
        },
        price_amount: Number(price),
      });
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        router.push(`/quests/${result.data.quest.id}`);
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
      <Field label={t("createQuest.fieldTitle")}>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </Field>

      <Field label={t("createQuest.fieldDescription")}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>

      <Field label={t("createQuest.fieldLocation")}>
        <select value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputClass}>
          {SEOUL_NEIGHBORHOODS.map((n) => (
            <option key={n.label} value={n.label}>
              {n.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("createQuest.fieldDate")}>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
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
            max={100}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </div>

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
                difficulty === d ? "border-blue/50 bg-blue-soft text-blue" : "border-line bg-surface text-ink-muted",
              )}
            >
              {t(`difficulty.${d}`)}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("creator.fieldPrice")}>
        <input
          required
          type="number"
          min={1}
          max={200000}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={inputClass}
        />
      </Field>
      <p className="-mt-3 text-[11.5px] text-ink-faint">{t("creator.revenueShareNote", { pct: 70 })}</p>

      {error && <p className="text-[13px] text-coral">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-button bg-violet py-3.5 font-display text-[14px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("creator.publish")}
      </button>
    </form>
  );
}
