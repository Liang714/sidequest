"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SEOUL_NEIGHBORHOODS } from "@/lib/seoul-neighborhoods";
import { createBusinessAction } from "@/app/actions/business";
import { Field, inputClass } from "./form-field";

export function BusinessRegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [neighborhood, setNeighborhood] = useState<string>(SEOUL_NEIGHBORHOODS[0].label);
  const [description, setDescription] = useState("");

  const submit = () => {
    setError(null);
    const spot = SEOUL_NEIGHBORHOODS.find((n) => n.label === neighborhood) ?? SEOUL_NEIGHBORHOODS[0];
    startTransition(async () => {
      const result = await createBusinessAction({
        name,
        category,
        location: { lat: spot.lat, lng: spot.lng, city: "Seoul", country: "KR", place_name: spot.label },
        description: description.trim() || null,
      });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
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
      <p className="text-[13px] text-ink-muted">{t("business.registerIntro")}</p>

      <Field label={t("business.fieldName")}>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("business.fieldNamePlaceholder")}
          className={inputClass}
        />
      </Field>

      <Field label={t("business.fieldCategory")}>
        <input
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={t("business.fieldCategoryPlaceholder")}
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

      <Field label={t("business.fieldDescription")}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("business.fieldDescriptionPlaceholder")}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-[13px] text-coral">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-button bg-blue py-3.5 font-display text-[14px] font-semibold text-white shadow-glow-blue disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("business.register")}
      </button>
    </form>
  );
}
