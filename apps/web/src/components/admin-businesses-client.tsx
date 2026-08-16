"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { verifyBusinessAction } from "@/app/actions/business";
import type { BusinessOut } from "@sidequest/types";

export function AdminBusinessesClient({ businesses }: { businesses: BusinessOut[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = (businessId: string, action: "verify" | "reject") => {
    setError(null);
    setPendingId(businessId);
    startTransition(async () => {
      const result = await verifyBusinessAction(businessId, action);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  if (businesses.length === 0) {
    return <p className="text-[13px] text-ink-faint">{t("admin.noPendingBusinesses")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[13px] text-coral">{error}</p>}
      {businesses.map((b) => (
        <div key={b.id} className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-[14px] font-semibold text-ink">{b.name}</div>
              <div className="text-[12px] text-ink-muted">
                {b.category} · {b.location.city}
              </div>
            </div>
          </div>
          {b.description && <p className="mt-2 text-[13px] text-ink-muted">{b.description}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending && pendingId === b.id}
              onClick={() => act(b.id, "verify")}
              className="flex-1 rounded-button bg-lime py-2.5 font-display text-[12.5px] font-semibold text-[#0B0B0F] disabled:opacity-60"
            >
              {t("admin.verify")}
            </button>
            <button
              type="button"
              disabled={pending && pendingId === b.id}
              onClick={() => act(b.id, "reject")}
              className="flex-1 rounded-button border border-coral/40 py-2.5 font-display text-[12.5px] font-semibold text-coral disabled:opacity-60"
            >
              {t("admin.reject")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
