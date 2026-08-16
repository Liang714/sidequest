import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Workspace packages ship as plain TS/JSON, not pre-built — let Next.js
  // transpile them itself rather than adding a build step to each package.
  transpilePackages: ["@sidequest/design-tokens", "@sidequest/i18n", "@sidequest/types"],
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
