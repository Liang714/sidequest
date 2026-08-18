import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-2 flex items-center gap-2 font-display text-[14px] font-bold text-ink">
        <span className="h-[7px] w-[7px] rounded-full bg-lime shadow-glow-lime" />
        {t("app.name")}
      </div>
      <h1 className="mt-4 font-display text-[24px] font-bold text-ink">{t("auth.resetPasswordTitle")}</h1>
      <p className="mt-1 text-[14px] text-ink-muted">{t("auth.resetPasswordSub")}</p>
      <div className="mt-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-[13px] text-coral">{t("auth.verifyEmailError")}</p>
        )}
      </div>
      <Link
        href="/login"
        className="mt-6 block text-center text-[13px] font-medium text-blue underline underline-offset-2"
      >
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
}
