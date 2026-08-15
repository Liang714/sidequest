"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { categoryEmoji, difficultyStars, type Category, type Difficulty } from "@/lib/types";
import { CategoryChip } from "./category-chip";

const CATEGORIES = Object.keys(categoryEmoji) as Category[];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "epic"];
const VISIBILITIES = ["public", "friends", "private"] as const;

export function CreateQuestForm() {
  const t = useTranslations();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(90);
  const [budget, setBudget] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [category, setCategory] = useState<Category>("random");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [visibility, setVisibility] = useState<(typeof VISIBILITIES)[number]>("public");
  const [published, setPublished] = useState(false);

  if (published) {
    const stars = "★".repeat(difficultyStars[difficulty]) + "☆".repeat(4 - difficultyStars[difficulty]);
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-card border border-lime/40 bg-lime-soft p-4 text-[13px] text-ink">
          {t("createQuest.publishHint")}
        </div>
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <div
            className="flex h-28 items-start justify-between p-3"
            style={{ background: "linear-gradient(135deg, #4C6FFF, #9D6BFF)" }}
          >
            <span className="text-2xl">{categoryEmoji[category]}</span>
            <span className="rounded-chip bg-black/35 px-2 py-1 font-mono text-[11px] text-white">
              {stars}
            </span>
          </div>
          <div className="p-4">
            <div className="font-display text-[15px] font-semibold text-ink">
              {title || t("createQuest.fieldTitlePlaceholder")}
            </div>
            <div className="mt-2 flex flex-col gap-1 text-[13px] text-ink-muted">
              <span>📍 {location || "—"}</span>
              <span>
                🕘 {date || "—"} {startTime}
              </span>
              <span>💰 {budget ? `₩${budget}` : t("createQuest.budgetFree")}</span>
              <span>👥 0/{maxParticipants}</span>
            </div>
            {description && <p className="mt-3 text-[13px] text-ink-muted">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPublished(false)}
          className="text-[12px] text-ink-faint underline underline-offset-2"
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setPublished(true);
      }}
    >
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
        <input
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("createQuest.fieldLocationPlaceholder")}
          className={inputClass}
        />
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
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="15,000"
          className={inputClass}
        />
      </Field>

      <Field label={t("createQuest.fieldCategory")}>
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

      <Field label={t("createQuest.fieldDifficulty")}>
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

      <Field label={t("createQuest.fieldVisibility")}>
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

      <button
        type="submit"
        className="rounded-button bg-blue py-3.5 font-display text-[14px] font-semibold text-white shadow-glow-blue"
      >
        {t("createQuest.publish")}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-button border border-line bg-surface-elevated px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-blue";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
      {children}
    </label>
  );
}
