import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { ResendVerificationButton } from "@/components/resend-verification-button";
import { requireSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await requireSession();
  const t = await getTranslations();

  return (
    <AppShell>
      <h1 className="mb-5 font-display text-[20px] font-bold text-ink">{t("settings.title")}</h1>

      <section className="rounded-card border border-line bg-surface p-4">
        <h2 className="mb-3 font-display text-[14px] font-semibold text-ink">{t("settings.account")}</h2>
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-muted">{t("settings.email")}</span>
          <span className="text-ink">{session.email}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[13px]">
          <span
            className={
              session.email_verified
                ? "font-mono text-[11px] text-lime"
                : "font-mono text-[11px] text-ink-faint"
            }
          >
            {session.email_verified ? `✓ ${t("settings.emailVerified")}` : t("settings.emailUnverified")}
          </span>
          {!session.email_verified && <ResendVerificationButton />}
        </div>
      </section>

      {/* Moved out of the header, which overflowed at 390px. These are
          preferences, not per-session actions. */}
      <section className="mt-5 rounded-card border border-line bg-surface p-4">
        <h2 className="mb-3 text-h3 text-ink">{t("settings.preferences")}</h2>
        <div className="flex items-center justify-between py-2">
          <span className="text-body-s text-ink-muted">{t("settings.language")}</span>
          <LocaleSwitcher />
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-body-s text-ink-muted">{t("settings.appearance")}</span>
          <ThemeToggle />
        </div>
      </section>

      <section className="mt-5 rounded-card border border-coral/30 bg-surface p-4">
        <h2 className="mb-1 font-display text-[14px] font-semibold text-coral">{t("settings.dangerZone")}</h2>
        <p className="mb-4 text-[12.5px] text-ink-muted">{t("settings.dangerZoneSubline")}</p>
        <DeleteAccountForm />
      </section>
    </AppShell>
  );
}
