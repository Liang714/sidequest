"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { registerAction, type ActionResult } from "@/app/actions/auth";
import { Field, inputClass } from "./form-field";

const initialState: ActionResult = {};

export function RegisterForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("auth.displayName")}>
        <input required name="display_name" maxLength={64} className={inputClass} />
      </Field>
      <Field label={t("auth.username")}>
        <input
          required
          name="username"
          pattern="[a-zA-Z0-9_]+"
          minLength={3}
          maxLength={32}
          className={inputClass}
        />
      </Field>
      <Field label={t("auth.email")}>
        <input required type="email" name="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field label={t("auth.password")}>
        <input
          required
          type="password"
          name="password"
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      {state.error && <p className="text-[13px] text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-button bg-blue py-3.5 font-display text-[14px] font-semibold text-white shadow-glow-blue disabled:opacity-60"
      >
        {t("auth.signUp")}
      </button>
    </form>
  );
}
