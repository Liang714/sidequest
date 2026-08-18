import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata = { title: "Privacy Policy — SIDEQUEST" };

export default async function PrivacyPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-[13px] text-ink-muted">
        ← {t("common.back")}
      </Link>
      <h1 className="mb-1 font-display text-[22px] font-bold text-ink">Privacy Policy</h1>
      <p className="mb-6 text-[12px] text-ink-faint">
        Last updated 2026-08-18. This describes what SIDEQUEST actually collects and does today — not a
        generic template. Like our Terms, it’s a good-faith draft, not a substitute for real legal review
        before this scales.
      </p>

      <Section title="What we collect">
        <List
          items={[
            "Account info: email, username, password (stored as a salted Argon2id hash — we never see or store your actual password)",
            "Profile info you choose to add: display name, real name (hidden from other users by default), bio, avatar",
            "Location: only your approximate area (never your exact live coordinates) to show nearby quests — a quest’s exact meeting point is a public place its creator chose, not anyone’s live position",
            "Quest activity: quests you create/join/complete, objectives, chat messages within a quest room, photos you upload to verify a photo objective",
            "Usage signals for the features you actually use: AI generation requests (structured context only — never raw chat transcripts), achievement/XP history",
            "Payment records when a real payment provider is enabled (amount, status, provider reference) — never your card number, which goes directly to the payment provider",
          ]}
        />
      </Section>

      <Section title="What we don’t do">
        <List
          items={[
            "We don’t sell your data.",
            "We don’t share your exact location with other users, ever.",
            "We don’t show your real name to anyone unless you explicitly set it to public.",
            "We don’t use AI to auto-publish anything on your behalf.",
          ]}
        />
      </Section>

      <Section title="AI and your photos">
        If you complete a photo-verified objective, the photo is analyzed by an AI vision model to give
        an advisory opinion on whether it matches the objective. That opinion never blocks your
        completion or withholds XP — we measured its real accuracy (58% correct in our own testing)
        before deciding it isn’t reliable enough to gate anything on. The photo itself is stored so it
        can be reviewed if there’s ever a moderation report about it.
      </Section>

      <Section title="Who else sees your data">
        Infrastructure providers that host and run the service (Fly.io for the backend/database, Vercel
        for the web app) — they process data on our behalf, not for their own purposes. If enabled: an
        email provider (for account verification / password reset emails), an AI provider (Anthropic) for
        AI features, and a payment provider (Stripe or Toss) for real payments. We don’t hand your data to
        anyone else.
      </Section>

      <Section title="Reports and moderation">
        If you or someone else files a report, the report (including enough context to act on it — who
        reported what, and why) goes to a real admin review queue, not a black hole. Reported content may
        be reviewed even after you delete it — see the next section.
      </Section>

      <Section title="Deleting your account">
        You can delete your account any time from Settings. Your account is deactivated immediately and
        your email/username are freed up for reuse. We keep the underlying records rather than instantly
        destroying them — same as quests, messages, and other content you “delete” elsewhere in the app —
        because an open moderation investigation may still need them. This is a deliberate, disclosed
        trade-off, not an oversight.
      </Section>

      <Section title="Your rights">
        You can access, correct, or delete most of your own data directly in the app (profile edit,
        account deletion in{" "}
        <Link href="/settings" className="underline underline-offset-2">
          Settings
        </Link>
        ). For anything else, reach out through the contact details on our GitHub repository.
      </Section>

      <Section title="Changes">
        We may update this policy as the product changes. Meaningful changes will be reflected here with
        an updated date.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-1.5 font-display text-[14px] font-semibold text-ink">{title}</h2>
      <div className="text-[13px] leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
