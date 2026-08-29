import { notFound } from "next/navigation";
import { KitchenSink } from "./kitchen-sink";

/**
 * CREW design system live preview — stage 1 of the rebuild.
 *
 * Deliberately OUTSIDE the [locale] segment: it's a developer surface, not
 * product, so it doesn't go through next-intl and its copy is intentionally
 * hardcoded English (the no-hardcoded-strings rule applies to product
 * screens).
 *
 * 404s outside development so it can never ship to real users.
 */
export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <KitchenSink />;
}
