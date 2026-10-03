"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { MapPin, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Button } from "@/components/ui";
import { CategoryIcon } from "./category-icon";
import { categoryShortKey } from "@/lib/format";
import type { Category } from "@/lib/types";
import { LOCATION_COOKIE } from "@/lib/location-shared";
import { finishOnboardingAction } from "@/app/actions/onboarding";
import type { InterestOut } from "@sidequest/types";

const GROUP_SIZES = ["step2Alone", "step2Small", "step2Large"] as const;
const VIBES = ["chill", "spontaneous", "competitive", "creative", "adventurous", "social"] as const;

/**
 * Onboarding — spec §C.
 *
 * Three steps, not four. Group size and vibe are both one-tap chip choices,
 * so splitting them across two screens spent a drop-off for nothing; Miller's
 * Law tolerates them together comfortably.
 *
 * The interests step shows a live count of matching quests nearby, so the
 * user watches value accrue while they invest rather than filling in a form
 * on faith. Location is last and genuinely skippable — the app stays fully
 * usable without it, only "nearby" degrades.
 */
export function OnboardingWizard({
  interests,
  questCategories,
}: {
  interests: InterestOut[];
  /** category_key of every quest currently near the default city view. */
  questCategories: string[];
}) {
  const t = useTranslations("onboarding");
  const tCategory = useTranslations("category");
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState<(typeof GROUP_SIZES)[number] | null>(null);
  const [vibes, setVibes] = useState<(typeof VIBES)[number][]>([]);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(list: T[], setList: (v: T[]) => void, value: T) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  // Steps: 0 interests · 1 group size + vibe · 2 location
  const canNext = [selectedInterestIds.length > 0, groupSize !== null && vibes.length > 0, true][step];

  const matchCount = useMemo(() => {
    if (selectedInterestIds.length === 0) return 0;
    const chosen = new Set(
      interests.filter((i) => selectedInterestIds.includes(i.id)).map((i) => i.category),
    );
    return questCategories.filter((key) => chosen.has(categoryShortKey(key))).length;
  }, [selectedInterestIds, interests, questCategories]);

  const requestLocation = () => {
    setLocationStatus("requesting");
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.cookie = `${LOCATION_COOKIE}=${pos.coords.latitude},${pos.coords.longitude}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 },
    );
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const result = await finishOnboardingAction(selectedInterestIds);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-8">
      <div className="mb-8 flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={clsx(
              "h-2.5 flex-1 rounded-pill border border-line transition-colors duration-base ease-snap",
              i <= step ? "bg-hot" : "bg-surface",
            )}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepShell title={t("step1Title")} sub={t("step1Sub")}>
            <div className="grid grid-cols-3 gap-2.5">
              {interests.map((interest) => {
                const shortKey = interest.category as Category;
                const selected = selectedInterestIds.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(selectedInterestIds, setSelectedInterestIds, interest.id)}
                    className={clsx(
                      "flex min-h-11 flex-col items-center gap-1.5 rounded-card border px-2 py-4 text-caption font-semibold",
                      "transition-colors duration-150 ease-snap",
                      selected
                        ? "border-line bg-hot text-on-hot shadow-e1"
                        : "border-line bg-surface text-ink-muted",
                    )}
                  >
                    {selected ? (
                      <Check aria-hidden className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <CategoryIcon category={shortKey} className="h-5 w-5" />
                    )}
                    {tCategory(shortKey)}
                  </button>
                );
              })}
            </div>

            {/* Value accrues as they invest — spec §C step 3. */}
            <p
              aria-live="polite"
              className={clsx(
                "mt-4 text-center text-body-s font-semibold",
                matchCount > 0 ? "text-pink-text" : "text-ink-faint",
              )}
            >
              {matchCount > 0 ? t("matchCount", { count: matchCount }) : t("matchNone")}
            </p>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title={t("step2Title")} sub={t("step2Sub")}>
            <p className="mb-2 text-label uppercase text-ink-faint">{t("groupSizeLabel")}</p>
            <div className="flex flex-col gap-2.5">
              {GROUP_SIZES.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={groupSize === g}
                  onClick={() => setGroupSize(g)}
                  className={clsx(
                    "flex min-h-11 items-center gap-2 rounded-card border px-4 py-3.5 text-left text-h3",
                    "transition-colors duration-150 ease-snap",
                    groupSize === g
                      ? "border-line bg-hot text-on-hot shadow-e1"
                      : "border-line bg-surface text-ink",
                  )}
                >
                  {groupSize === g && <Check aria-hidden className="h-4 w-4" strokeWidth={3} />}
                  {t(g)}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-6 text-label uppercase text-ink-faint">{t("vibeLabel")}</p>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={vibes.includes(v)}
                  onClick={() => toggle(vibes, setVibes, v)}
                  className={clsx(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-chip border px-4 text-caption font-semibold",
                    "transition-colors duration-150 ease-snap",
                    vibes.includes(v)
                      ? "border-line bg-hot text-on-hot shadow-e1"
                      : "border-line bg-surface text-ink-muted",
                  )}
                >
                  {vibes.includes(v) && <Check aria-hidden className="h-[13px] w-[13px]" strokeWidth={3} />}
                  {t(`vibe.${v}`)}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title={t("step4Title")} sub={t("step4Sub")}>
            <div className="mt-2 flex h-40 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line text-center">
              <MapPin aria-hidden className="h-9 w-9 text-hot-text" />
              {locationStatus === "granted" && (
                <span className="text-caption font-semibold text-pink-text">{t("locationSaved")}</span>
              )}
              {locationStatus === "denied" && (
                <span className="px-6 text-caption text-ink-faint">{t("locationDenied")}</span>
              )}
            </div>
            {error && (
              <p role="alert" className="mt-3 text-body-s text-danger-text">
                {error}
              </p>
            )}
          </StepShell>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)}>
            {t("back")}
          </Button>
        )}
        {step < 2 ? (
          <Button block size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
            {t("next")}
          </Button>
        ) : (
          <div className="flex flex-1 gap-3">
            {/* Skipping is a real option, not a dark-pattern decoy — the app
                stays usable, only "nearby" degrades to a city view. */}
            <Button variant="secondary" size="lg" className="flex-1" disabled={pending} onClick={finish}>
              {t("step4Skip")}
            </Button>
            <Button
              size="lg"
              className="flex-1"
              loading={pending}
              onClick={() => {
                requestLocation();
                finish();
              }}
            >
              {t("step4Allow")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="text-display text-ink">{title}</h1>
      <p className="mt-2 text-body text-ink-muted">{sub}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
