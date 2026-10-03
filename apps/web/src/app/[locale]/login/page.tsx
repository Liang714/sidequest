import { getTranslations, getLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getOptionalSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  if (await getOptionalSession()) {
    redirect({ href: "/", locale: await getLocale() });
  }
  const t = await getTranslations();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-2 flex items-center gap-2 font-display text-[14px] font-bold text-ink">
        <span className="h-3 w-3 rounded-full border-2 border-line bg-pop-pink" />
        {t("app.name")}
      </div>
      <h1 className="mt-4 font-display text-[24px] font-bold text-ink">{t("auth.loginTitle")}</h1>
      <p className="mt-1 text-[14px] text-ink-muted">{t("auth.loginSub")}</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <Link
        href="/forgot-password"
        className="mt-4 block text-center text-[12.5px] text-ink-muted underline underline-offset-2"
      >
        {t("auth.forgotPasswordLink")}
      </Link>
      <p className="mt-6 text-center text-[13px] text-ink-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-blue underline underline-offset-2">
          {t("auth.createOne")}
        </Link>
      </p>
    </div>
  );
}
