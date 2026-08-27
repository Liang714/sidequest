import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // `dev` is excluded alongside api/_next: developer surfaces (/dev/*) live
  // outside the [locale] segment and have their own root layout, so locale
  // negotiation would just redirect them into a route that doesn't exist.
  matcher: ["/((?!api|_next|_vercel|dev|.*\\..*).*)"],
};
