"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { forgotPasswordAction, type ActionResult } from "@/app/actions/auth";
import { Field, inputClass } from "./form-field";

const initialState: ActionResult = {};

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [sent, setSent] = useState(false);
  const wrappedAction = async (_prev: ActionResult, formData: FormData) => {
    const result = await forgotPasswordAction(_prev, formData);
    if (!result.error) setSent(true);
    return result;
  };
  const [state, formAction, pending] = useActionState(wrappedAction, initialState);

  if (sent) {
    return <p className="text-[13px] text-ink-muted">{t("auth.forgotPasswordSent")}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label={t("auth.email")}>
        <input required type="email" name="email" autoComplete="email" className={inputClass} />
      </Field>
      {state.error && <p className="text-[13px] text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-button pressable border border-line bg-hot py-3.5 font-display text-[14px] font-bold text-on-hot disabled:opacity-60"
      >
        {t("auth.forgotPasswordCta")}
      </button>
    </form>
  );
}
