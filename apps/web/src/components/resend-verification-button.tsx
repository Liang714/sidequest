"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { resendVerificationAction } from "@/app/actions/auth";

export function ResendVerificationButton() {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return <p className="text-[12.5px] text-lime">{t("settings.verificationSent")}</p>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await resendVerificationAction();
            if (result.error) setError(result.error);
            else setSent(true);
          });
        }}
        className="text-[12.5px] font-medium text-blue underline underline-offset-2 disabled:opacity-60"
      >
        {t("settings.resendVerification")}
      </button>
      {error && <p className="mt-1 text-[11.5px] text-coral">{error}</p>}
    </div>
  );
}
