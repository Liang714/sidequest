"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type ActionResult } from "@/app/actions/auth";
import { Field, inputClass } from "./form-field";

const initialState: ActionResult = {};

export function LoginForm() {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("auth.email")}>
        <input required type="email" name="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field label={t("auth.password")}>
        <input
          required
          type="password"
          name="password"
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      {state.error && <p className="text-[13px] text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-button pressable border border-line bg-hot py-3.5 font-display text-[14px] font-bold text-on-hot disabled:opacity-60"
      >
        {t("auth.logIn")}
      </button>
    </form>
  );
}
