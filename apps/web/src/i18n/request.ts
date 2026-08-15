import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import enMessages from "@sidequest/i18n/en.json";
import koMessages from "@sidequest/i18n/ko.json";

const messagesByLocale = { en: enMessages, ko: koMessages } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.includes(requested as (typeof routing.locales)[number])
    ? (requested as (typeof routing.locales)[number])
    : routing.defaultLocale;

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
