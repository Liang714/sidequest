"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useRouter } from "@/i18n/navigation";
import { categoryEmoji, type Category } from "@/lib/types";

const INTERESTS = Object.keys(categoryEmoji) as Category[];
const GROUP_SIZES = ["step2Alone", "step2Small", "step2Large"] as const;
const VIBES = ["chill", "spontaneous", "competitive", "creative", "adventurous", "social"] as const;

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tCategory = useTranslations("category");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<Category[]>([]);
  const [groupSize, setGroupSize] = useState<(typeof GROUP_SIZES)[number] | null>(null);
  const [vibes, setVibes] = useState<(typeof VIBES)[number][]>([]);

  const toggle = <T,>(list: T[], setList: (v: T[]) => void, value: T) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canNext = [interests.length > 0, groupSize !== null, vibes.length > 0, true][step];

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-8">
      <div className="mb-8 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors",
              i <= step ? "bg-blue" : "bg-surface-elevated",
            )}
          />
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepShell title={t("step1Title")} sub={t("step1Sub")}>
            <div className="grid grid-cols-3 gap-2.5">
              {INTERESTS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggle(interests, setInterests, c)}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 rounded-card border px-2 py-4 text-[12px] font-medium transition-colors",
                    interests.includes(c)
                      ? "border-blue/50 bg-blue-soft text-blue"
                      : "border-line bg-surface text-ink-muted",
                  )}
                >
                  <span className="text-xl">{categoryEmoji[c]}</span>
                  {tCategory(c)}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title={t("step2Title")} sub={t("step2Sub")}>
            <div className="flex flex-col gap-2.5">
              {GROUP_SIZES.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupSize(g)}
                  className={clsx(
                    "rounded-card border px-4 py-4 text-left font-display text-[15px] font-medium transition-colors",
                    groupSize === g
                      ? "border-blue/50 bg-blue-soft text-blue"
                      : "border-line bg-surface text-ink",
                  )}
                >
                  {t(g)}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title={t("step3Title")} sub={t("step3Sub")}>
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  onClick={() => toggle(vibes, setVibes, v)}
                  className={clsx(
                    "rounded-chip border px-4 py-2.5 text-[13px] font-medium transition-colors",
                    vibes.includes(v)
                      ? "border-blue/50 bg-blue-soft text-blue"
                      : "border-line bg-surface text-ink-muted",
                  )}
                >
                  {t(`vibe.${v}`)}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title={t("step4Title")} sub={t("step4Sub")}>
            <div className="mt-2 flex h-40 items-center justify-center rounded-card border border-dashed border-line text-4xl">
              📍
            </div>
          </StepShell>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-button border border-line px-5 py-3.5 font-display text-[14px] font-semibold text-ink-muted"
          >
            {t("back")}
          </button>
        )}
        {step < 3 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            className={clsx(
              "flex-1 rounded-button py-3.5 font-display text-[14px] font-semibold transition-colors",
              canNext ? "bg-blue text-white shadow-glow-blue" : "cursor-not-allowed bg-surface-elevated text-ink-faint",
            )}
          >
            {t("next")}
          </button>
        ) : (
          <div className="flex flex-1 gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex-1 rounded-button border border-line py-3.5 font-display text-[14px] font-semibold text-ink-muted"
            >
              {t("step4Skip")}
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 rounded-button bg-blue py-3.5 font-display text-[14px] font-semibold text-white shadow-glow-blue"
            >
              {t("step4Allow")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{title}</h1>
      <p className="mt-2 text-[14px] text-ink-muted">{sub}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

