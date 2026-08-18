"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { deleteAccountAction, type ActionResult } from "@/app/actions/auth";
import { Field, inputClass } from "./form-field";

const initialState: ActionResult = {};

export function DeleteAccountForm() {
  const t = useTranslations();
  const [confirmed, setConfirmed] = useState(false);
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("settings.deleteAccountPasswordLabel")}>
        <input required type="password" name="password" autoComplete="current-password" className={inputClass} />
      </Field>
      <label className="flex items-start gap-2 text-[12.5px] text-ink-muted">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        {t("settings.deleteAccountConfirmLabel")}
      </label>
      {state.error && <p className="text-[13px] text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || !confirmed}
        className="rounded-button border border-coral bg-coral/10 py-3 font-display text-[13px] font-semibold text-coral disabled:opacity-40"
      >
        {t("settings.deleteAccountButton")}
      </button>
    </form>
  );
}
