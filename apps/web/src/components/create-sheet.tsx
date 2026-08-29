"use client";


import { useTranslations } from "next-intl";
import { Plus, Sparkles, Route, ChevronRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Sheet } from "@/components/ui";

/**
 * The centre tab opens this instead of linking straight to the manual form.
 *
 * This is what rescues /plan — the Phase 8 itinerary planner, the most
 * capable thing the app can do, which until now had no navigation entry at
 * all and was reachable only by typing the URL (spec §A1 finding 3).
 *
 * Remaining AI quota is shown BEFORE the user invests effort, so nobody
 * types a prompt, waits ~15s and then eats a 402 (spec §F5).
 */

export interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
  /** null when the quota isn't known yet — the row simply omits the count. */
  aiRemaining?: number | null;
  isPro?: boolean;
}

export function CreateSheet({ open, onClose, aiRemaining, isPro = false }: CreateSheetProps) {
  const t = useTranslations("create");
  const router = useRouter();

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const quota = isPro
    ? t("quotaPro")
    : typeof aiRemaining === "number"
      ? t("quotaLeft", { count: aiRemaining })
      : null;

  return (
    <Sheet open={open} onClose={onClose} title={t("title")}>
      <ul className="flex flex-col gap-2">
        <Row
          icon={<Plus className="h-5 w-5" />}
          label={t("manual")}
          hint={t("manualHint")}
          onClick={() => go("/quests/new")}
        />
        <Row
          icon={<Sparkles className="h-5 w-5" />}
          label={t("ai")}
          hint={t("aiHint")}
          meta={quota}
          onClick={() => go("/quests/new?ai=1")}
        />
        <Row
          icon={<Route className="h-5 w-5" />}
          label={t("plan")}
          hint={t("planHint")}
          meta={quota}
          onClick={() => go("/plan")}
        />
      </ul>
    </Sheet>
  );
}

function Row({
  icon,
  label,
  hint,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  meta?: string | null;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left transition-colors duration-150 ease-crew hover:bg-surface-elevated"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-hot-soft text-hot-text">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-h3 text-ink">{label}</span>
            {meta && <span className="text-caption text-ink-faint">{meta}</span>}
          </span>
          <span className="block text-caption text-ink-muted">{hint}</span>
        </span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-ink-faint" />
      </button>
    </li>
  );
}
