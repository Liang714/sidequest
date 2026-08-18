import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata = { title: "Terms of Service — SIDEQUEST" };

export default async function TermsPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-[13px] text-ink-muted">
        ← {t("common.back")}
      </Link>
      <h1 className="mb-1 font-display text-[22px] font-bold text-ink">Terms of Service</h1>
      <p className="mb-6 text-[12px] text-ink-faint">
        Last updated 2026-08-18. This is a plain-language draft written for SIDEQUEST’s early launch —
        it has not been reviewed by a lawyer. Treat it as a good-faith statement of how the service
        actually works today, not a substitute for real legal review before this scales.
      </p>

      <Section title="1. What SIDEQUEST is">
        SIDEQUEST helps you find and join real-world activities (“SideQuests”) with other people nearby.
        You create or join a Quest, meet up in person, and (optionally) earn XP and achievements for
        completing it. Some features are AI-assisted; AI never publishes anything on your behalf without
        you reviewing and confirming it first.
      </Section>

      <Section title="2. Who can use it">
        You must be at least 18 years old to create an account. SIDEQUEST coordinates real, in-person
        meetups with people you may not know — we don’t think it’s appropriate for minors to use
        unsupervised. We currently rely on you confirming this when you register, not on a separate
        age-verification step.
      </Section>

      <Section title="3. Your account">
        You’re responsible for keeping your password secret and for anything that happens under your
        account. Use a real email address you control — it’s the only way to recover access if you
        forget your password. You can delete your account at any time from Settings; see our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>{" "}
        for what happens to your data when you do.
      </Section>

      <Section title="4. Meeting people in person">
        SIDEQUEST connects you with strangers for real-world activities. We can’t guarantee anyone’s
        identity, behavior, or intentions. Use ordinary common sense: meet in public places (which quest
        meeting points are designed around), tell someone else your plans, and trust your judgment. Report
        or block anyone who makes you uncomfortable — reports go to a real moderation queue, not a black
        hole.
      </Section>

      <Section title="5. Content you post">
        You’re responsible for what you post — quest descriptions, chat messages, photos, your profile.
        Don’t post anything illegal, harassing, or that violates someone else’s rights. We can remove
        content or suspend accounts that violate these terms, based on reports or our own review.
      </Section>

      <Section title="6. AI features">
        Some features (quest generation, itinerary planning, photo verification, recommendation
        explanations) use AI models. AI-generated quest drafts are never published without you reviewing
        and confirming them. Photo verification is advisory only — we measured its real accuracy (58% on
        a labeled test set) before deciding it should never be the sole reason an objective counts as
        complete or doesn’t; see our public roadmap notes if you want the details.
      </Section>

      <Section title="7. Payments (when enabled)">
        Some features (Pro subscription, AI credit packs, the creator marketplace, activity bookings) may
        involve real payments once fully enabled. Card details are handled entirely by our payment
        provider (Stripe or Toss Payments) — they never pass through or get stored on SIDEQUEST’s own
        servers.
      </Section>

      <Section title="8. No warranty, limited liability">
        SIDEQUEST is provided as-is, without warranties of any kind. To the fullest extent the law
        allows, we’re not liable for anything that happens at an in-person meetup, or for indirect or
        consequential damages from using the service.
      </Section>

      <Section title="9. Changes">
        We may update these terms as the product changes. Meaningful changes will be reflected here with
        an updated date.
      </Section>

      <Section title="10. Contact">
        Questions about these terms? Reach out through the contact details on our GitHub repository.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-1.5 font-display text-[14px] font-semibold text-ink">{title}</h2>
      <p className="text-[13px] leading-relaxed text-ink-muted">{children}</p>
    </section>
  );
}
