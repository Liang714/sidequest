import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { verifyEmailAction } from "@/app/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations();
  const result = token ? await verifyEmailAction(token) : { error: t("auth.verifyEmailError") };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10 text-center">
      <div className="mb-2 flex items-center justify-center gap-2 font-display text-[14px] font-bold text-ink">
        <span className="h-[7px] w-[7px] rounded-full bg-lime shadow-glow-lime" />
        {t("app.name")}
      </div>
      {result.error ? (
        <p className="mt-6 text-[14px] text-coral">{result.error}</p>
      ) : (
        <p className="mt-6 text-[14px] text-ink">{t("auth.verifyEmailSuccess")}</p>
      )}
      <Link
        href="/"
        className="mt-6 rounded-button bg-blue py-3.5 font-display text-[14px] font-semibold text-white shadow-glow-blue"
      >
        {t("auth.continueToApp")}
      </Link>
    </div>
  );
}
