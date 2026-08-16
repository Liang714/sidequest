"""Aggregated analytics for a business's sponsored quests — Phase 4's
`analytics_events` table plus the existing quest-participation tables.

Definitions, spelled out because none of these are as obvious as they
look:
  - views:       `quest_viewed` analytics events for the quest (logged on
                 every GET /quests/{id} — see routers/quests.py::get_quest)
  - joins:       quest_participants rows for the quest, excluding `left`
  - completions: quest_completions rows for the quest
  - redemptions: for `discount`-sponsorship quests, defined as
                 completions — the discount is "redeemed" by actually
                 doing the activity. There's no separate in-person
                 redemption-scanning flow built yet, so this is a
                 deliberate simplification, not a real distinct signal.
                 Non-discount sponsorship types don't have a redemption
                 concept and always report 0.
"""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent
from app.models.business import BusinessQuest, SponsorshipType
from app.models.quests import ParticipantStatus, Quest, QuestCompletion, QuestParticipant
from app.schemas.business import BusinessAnalyticsOut, QuestAnalyticsOut


async def get_business_analytics(db: AsyncSession, business_id: UUID) -> BusinessAnalyticsOut:
    sponsored = (
        await db.execute(
            select(BusinessQuest, Quest.title)
            .join(Quest, Quest.id == BusinessQuest.quest_id)
            .where(BusinessQuest.business_id == business_id)
        )
    ).all()

    per_quest: list[QuestAnalyticsOut] = []
    for bq, title in sponsored:
        quest_id = bq.quest_id
        views = (
            await db.scalar(
                select(func.count())
                .select_from(AnalyticsEvent)
                .where(
                    AnalyticsEvent.event_type == "quest_viewed",
                    AnalyticsEvent.payload["quest_id"].astext == str(quest_id),
                )
            )
        ) or 0
        joins = (
            await db.scalar(
                select(func.count())
                .select_from(QuestParticipant)
                .where(QuestParticipant.quest_id == quest_id, QuestParticipant.status != ParticipantStatus.left)
            )
        ) or 0
        completions = (
            await db.scalar(
                select(func.count()).select_from(QuestCompletion).where(QuestCompletion.quest_id == quest_id)
            )
        ) or 0
        redemptions = completions if bq.sponsorship_type == SponsorshipType.discount else 0

        per_quest.append(
            QuestAnalyticsOut(
                quest_id=quest_id,
                title=title,
                views=views,
                joins=joins,
                completions=completions,
                redemptions=redemptions,
            )
        )

    return BusinessAnalyticsOut(
        business_id=business_id,
        total_views=sum(q.views for q in per_quest),
        total_joins=sum(q.joins for q in per_quest),
        total_completions=sum(q.completions for q in per_quest),
        total_redemptions=sum(q.redemptions for q in per_quest),
        quests=per_quest,
    )
