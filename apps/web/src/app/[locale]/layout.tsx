import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { spaceGrotesk } from "@/lib/fonts";
import { ViewTransitions } from "@/components/motion/transition-link";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "SIDEQUEST — What's your sidequest?",
  description:
    "Discover a spontaneous real-world activity, form a temporary group, and level up.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale as Locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={spaceGrotesk.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ViewTransitions>{children}</ViewTransitions>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
