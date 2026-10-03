"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resetPasswordAction, type ActionResult } from "@/app/actions/auth";
import { Field, inputClass } from "./form-field";

const initialState: ActionResult = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations();
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <Field label={t("auth.newPassword")}>
        <input
          required
          type="password"
          name="new_password"
          autoComplete="new-password"
          minLength={8}
          className={inputClass}
        />
      </Field>
      {state.error && <p className="text-[13px] text-coral">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-button pressable border border-line bg-hot py-3.5 font-display text-[14px] font-bold text-on-hot disabled:opacity-60"
      >
        {t("auth.resetPasswordCta")}
      </button>
    </form>
  );
}
