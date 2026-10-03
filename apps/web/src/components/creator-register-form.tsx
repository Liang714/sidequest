"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { becomeCreatorAction } from "@/app/actions/commerce";
import { Field, inputClass } from "./form-field";

export function CreatorRegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await becomeCreatorAction(displayName);
      if (result.error) setError(result.error);
      else router.refresh();
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
      <p className="text-[13px] text-ink-muted">{t("creator.registerIntro")}</p>
      <Field label={t("creator.fieldDisplayName")}>
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("creator.fieldDisplayNamePlaceholder")}
          className={inputClass}
        />
      </Field>
      {error && <p className="text-[13px] text-coral">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-button pressable border border-line bg-info py-3.5 font-display text-[14px] font-bold text-on-info disabled:opacity-60"
      >
        {pending ? t("common.loading") : t("creator.register")}
      </button>
    </form>
  );
}
