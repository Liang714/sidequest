import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Avatar, Badge, Chip } from "@/components/ui";
import { PublicProfileActions } from "@/components/public-profile-actions";
import type { PublicProfileOut } from "@sidequest/types";

/**
 * Public profile — spec §F2, and finding 2 in §A1.
 *
 * GET /users/{id} shipped in Phase 2 but no client ever called it, so there
 * was no way to obtain another user's id and POST /friends/request could
 * not be reached from the UI at all. This screen is what makes the app's
 * social half function, and it's the vetting surface presence depends on.
 *
 * Section order IS the argument: interests → shared history → behaviour.
 * "You've both completed N quests" is the most reassuring datum available
 * and costs one query. Appearance is structurally absent — the payload has
 * no such field to render.
 */
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const t = await getTranslations();

  if (id === session.user_id) {
    // Your own profile is a different screen with different affordances.
    const { redirect } = await import("@/i18n/navigation");
    const { getLocale } = await import("next-intl/server");
    redirect({ href: "/profile", locale: await getLocale() });
  }

  let profile: PublicProfileOut;
  try {
    profile = await apiFetch<PublicProfileOut>(`/users/${id}`);
  } catch (err) {
    // 404 covers both "no such user" and "one of you blocked the other" —
    // deliberately indistinguishable, so a block never reveals itself.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const myInterests = new Set<string>();

  return (
    <AppShell>
      <div className="flex flex-col items-center text-center">
        <Avatar
          name={profile.display_name || profile.username}
          userId={profile.user_id}
          src={profile.avatar_url}
          size="lg"
          ringClassName="border-transparent"
        />
        <h1 className="mt-3 text-h1 text-ink">{profile.display_name || profile.username}</h1>
        <p className="text-body-s text-ink-muted">@{profile.username}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Badge tone="neutral">{t("profile.level", { level: profile.level })}</Badge>
          {profile.is_friend && <Badge tone="mint">{t("publicProfile.friend")}</Badge>}
          {profile.mutual_friends > 0 && (
            <Badge tone="neutral">
              {t("publicProfile.mutuals", { count: profile.mutual_friends })}
            </Badge>
          )}
        </div>

        {profile.bio && <p className="mt-4 text-body italic text-ink">&ldquo;{profile.bio}&rdquo;</p>}
      </div>

      {profile.restricted ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-card border border-dashed border-line p-6 text-center">
          <Lock aria-hidden className="h-6 w-6 text-ink-faint" />
          <p className="text-body-s text-ink-muted">{t("publicProfile.restricted")}</p>
        </div>
      ) : (
        <>
          {profile.interests.length > 0 && (
            <Section title={t("publicProfile.into")}>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((key) => (
                  <Chip key={key} tone={myInterests.has(key) ? "shared" : "neutral"}>
                    {t(key as never)}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          {profile.shared_quests > 0 && (
            <Section title={t("publicProfile.together")}>
              <p className="rounded-card border border-mint-soft bg-mint-soft p-4 text-body-s font-semibold text-mint-text">
                {t("publicProfile.sharedQuests", { count: profile.shared_quests })}
              </p>
            </Section>
          )}

          <Section title={t("publicProfile.recently")}>
            <div className="grid grid-cols-2 gap-3">
              <Stat value={profile.completed_quests} label={t("publicProfile.completed")} />
              <Stat value={profile.achievements_unlocked} label={t("publicProfile.badges")} />
            </div>
          </Section>
        </>
      )}

      <PublicProfileActions
        userId={profile.user_id}
        displayName={profile.display_name || profile.username}
        isFriend={profile.is_friend}
        pending={profile.friend_request_pending}
      />
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-label uppercase text-ink-faint">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 text-center">
      <div className="text-h2 tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-caption text-ink-muted">{label}</div>
    </div>
  );
}
