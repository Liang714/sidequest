import { getTranslations } from "next-intl/server";
import { ChevronRight, Crown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, Badge } from "@/components/ui";
import type { ParticipantOut } from "@sidequest/types";

/**
 * "Who's going" — the trust surface. Spec §F2.
 *
 * Sits ABOVE the join CTA, not behind it. Meeting strangers is the real
 * barrier to this product, and the roster is what turns joining from a leap
 * into an informed decision. Every row links to that person's public
 * profile, which is the whole reason stage 4 had to ship before this.
 *
 * Faces are allowed to lead here: these people have already co-committed to
 * a public plan, which is exactly the case the Rule of Faces carves out.
 */
export async function QuestRoster({
  participants,
  creatorId,
  currentUserId,
  max,
}: {
  participants: ParticipantOut[];
  creatorId: string;
  currentUserId: string;
  max: number;
}) {
  const t = await getTranslations();
  const going = participants.filter((p) => p.status !== "left");

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-label uppercase text-ink-faint">{t("quest.whosGoing")}</h2>
        <span className="text-caption tabular-nums text-ink-muted">
          {t("quest.participants", { joined: going.length, max })}
        </span>
      </div>

      {going.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-4 text-center text-body-s text-ink-muted">
          {t("quest.nobodyYet")}
        </p>
      ) : (
        <ul className="rounded-card border border-line bg-surface px-4 shadow-e1">
          {going.map((p) => {
            const isMe = p.user_id === currentUserId;
            const row = (
              <>
                <Avatar name={p.username} userId={p.user_id} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-h3 text-ink">{p.username}</span>
                    {p.user_id === creatorId && (
                      <Badge tone="warn" icon={<Crown className="h-3 w-3" />}>
                        {t("quest.host")}
                      </Badge>
                    )}
                    {isMe && <Badge tone="pink">{t("quest.you")}</Badge>}
                  </span>
                </span>
                {!isMe && <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />}
              </>
            );

            return (
              <li key={p.user_id} className="border-b border-line last:border-b-0">
                {isMe ? (
                  <div className="flex min-h-11 items-center gap-3 py-3">{row}</div>
                ) : (
                  <Link
                    href={`/users/${p.user_id}`}
                    className="flex min-h-11 items-center gap-3 py-3"
                    aria-label={t("quest.viewProfileOf", { name: p.username })}
                  >
                    {row}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
