import { getTranslations } from "next-intl/server";
import { BadgeCheck, LogOut } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { ResendVerificationButton } from "@/components/resend-verification-button";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { Badge, Button } from "@/components/ui";

export default async function SettingsPage() {
  const session = await requireSession();
  const t = await getTranslations();

  return (
    <AppShell>
      <h1 className="mb-5 text-h1 text-ink">{t("settings.title")}</h1>

      <section className="rounded-card border border-line bg-surface p-4 shadow-e1">
        <h2 className="mb-3 text-h3 text-ink">{t("settings.account")}</h2>
        <div className="flex items-center justify-between gap-3 text-body-s">
          <span className="text-ink-muted">{t("settings.email")}</span>
          <span className="truncate text-ink">{session.email}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {/* Verification state is a badge with an icon, not a bare check
              glyph — the state is never carried by colour alone (spec §K). */}
          {session.email_verified ? (
            <Badge tone="mint" icon={<BadgeCheck className="h-3 w-3" />}>
              {t("settings.emailVerified")}
            </Badge>
          ) : (
            <Badge tone="warn">{t("settings.emailUnverified")}</Badge>
          )}
          {!session.email_verified && <ResendVerificationButton />}
        </div>
      </section>

      {/* Moved out of the header, which overflowed at 390px. These are
          preferences, not per-session actions. */}
      <section className="mt-5 rounded-card border border-line bg-surface p-4 shadow-e1">
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

      {/* Log out lives here rather than in the header: it's taken about once
          a month and was crowding out actions taken every session. */}
      <section className="mt-5">
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" block icon={<LogOut className="h-4 w-4" />}>
            {t("auth.logOut")}
          </Button>
        </form>
      </section>

      <section className="mt-5 rounded-card border border-danger-soft bg-surface p-4">
        <h2 className="mb-1 text-h3 text-danger-text">{t("settings.dangerZone")}</h2>
        <p className="mb-4 text-caption text-ink-muted">{t("settings.dangerZoneSubline")}</p>
        <DeleteAccountForm />
      </section>
    </AppShell>
  );
}
