from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select, tuple_
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession
from app.models.gamification import Achievement, UserAchievement
from app.models.identity import User
from app.models.quests import (
    Location,
    ParticipantStatus,
    Quest,
    QuestCategory,
    QuestCompletion,
    QuestObjective,
    QuestObjectiveCompletion,
    QuestParticipant,
    QuestStatus,
)
from app.schemas.quests import (
    LocationOut,
    ObjectiveOut,
    ParticipantOut,
    QuestCreate,
    QuestOut,
    QuestSummaryOut,
    QuestUpdate,
)
from app.services import quest_service
from app.services.xp_service import award_xp

router = APIRouter(prefix="/quests", tags=["quests"])

DEFAULT_XP_COMPLETION_BONUS = {"first_quest": 50}


async def _get_quest_or_404(db: DbSession, quest_id: UUID) -> Quest:
    quest = await db.scalar(
        select(Quest)
        .options(
            selectinload(Quest.location),
            selectinload(Quest.category),
            selectinload(Quest.objectives),
            selectinload(Quest.participants),
        )
        .where(Quest.id == quest_id, Quest.deleted_at.is_(None))
        # The session's identity map otherwise serves the Quest object (and
        # its already-loaded .participants collection) from cache rather
        # than reflecting a write this same request just committed —
        # populate_existing forces this query to actually overwrite it.
        .execution_options(populate_existing=True)
    )
    if quest is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quest not found")
    return quest


async def _participant_usernames(db: DbSession, quest: Quest) -> list[ParticipantOut]:
    if not quest.participants:
        return []
    user_ids = [p.user_id for p in quest.participants]
    users = {u.id: u for u in (await db.scalars(select(User).where(User.id.in_(user_ids)))).all()}
    return [
        ParticipantOut(user_id=p.user_id, username=users[p.user_id].username, status=p.status)
        for p in quest.participants
        if p.user_id in users
    ]


async def _to_quest_out(db: DbSession, quest: Quest, *, current_user_id: UUID | None = None) -> QuestOut:
    completed_objective_ids: set[UUID] = set()
    if current_user_id and quest.objectives:
        rows = await db.scalars(
            select(QuestObjectiveCompletion.objective_id).where(
                QuestObjectiveCompletion.user_id == current_user_id,
                QuestObjectiveCompletion.objective_id.in_([o.id for o in quest.objectives]),
            )
        )
        completed_objective_ids = set(rows.all())

    return QuestOut(
        id=quest.id,
        creator_id=quest.creator_id,
        title=quest.title,
        description=quest.description,
        category_key=quest.category.key,
        location=LocationOut.model_validate(quest.location),
        start_time=quest.start_time,
        duration_minutes=quest.duration_minutes,
        budget_amount=quest.budget_amount,
        currency=quest.currency,
        max_participants=quest.max_participants,
        difficulty=quest.difficulty,
        status=quest.status,
        visibility=quest.visibility,
        xp_reward=quest.xp_reward,
        joined_count=len([p for p in quest.participants if p.status != ParticipantStatus.left]),
        objectives=[
            ObjectiveOut(
                id=o.id,
                order_index=o.order_index,
                description=o.description,
                verification_type=o.verification_type,
                is_required=o.is_required,
                completed_by_me=o.id in completed_objective_ids,
            )
            for o in quest.objectives
        ],
        participants=await _participant_usernames(db, quest),
    )


@router.post("", response_model=QuestOut, status_code=status.HTTP_201_CREATED)
async def create_quest(body: QuestCreate, current_user: CurrentUser, db: DbSession) -> QuestOut:
    category = await db.scalar(select(QuestCategory).where(QuestCategory.key == body.category_key))
    if category is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown category '{body.category_key}'")

    location = Location(**body.location.model_dump())
    db.add(location)
    await db.flush()

    quest = Quest(
        creator_id=current_user.id,
        category_id=category.id,
        title=body.title,
        description=body.description,
        location_id=location.id,
        start_time=body.start_time,
        duration_minutes=body.duration_minutes,
        budget_amount=body.budget_amount,
        currency=body.currency,
        max_participants=body.max_participants,
        difficulty=body.difficulty,
        visibility=body.visibility,
        xp_reward=body.xp_reward,
        status=QuestStatus.open,
    )
    db.add(quest)
    await db.flush()

    for i, obj in enumerate(body.objectives):
        db.add(
            QuestObjective(
                quest_id=quest.id,
                order_index=i,
                description=obj.description,
                verification_type=obj.verification_type,
                is_required=obj.is_required,
            )
        )
    await db.commit()

    return await _to_quest_out(db, await _get_quest_or_404(db, quest.id), current_user_id=current_user.id)


@router.get("", response_model=list[QuestSummaryOut])
async def list_quests(
    current_user: CurrentUser,
    db: DbSession,
    category: str | None = None,
    budget_max: Decimal | None = None,
    difficulty: str | None = None,
    limit: int = Query(default=20, le=50, ge=1),
    cursor: str | None = None,
) -> list[QuestSummaryOut]:
    stmt = (
        select(Quest)
        .options(selectinload(Quest.location), selectinload(Quest.category), selectinload(Quest.participants))
        .where(Quest.deleted_at.is_(None), Quest.status == QuestStatus.open)
        .order_by(Quest.start_time.asc(), Quest.id.asc())
        .limit(limit)
    )
    if category:
        stmt = stmt.join(QuestCategory).where(QuestCategory.key == category)
    if budget_max is not None:
        stmt = stmt.where((Quest.budget_amount.is_(None)) | (Quest.budget_amount <= budget_max))
    if difficulty:
        stmt = stmt.where(Quest.difficulty == difficulty)
    if cursor:
        cursor_time, cursor_id = quest_service.decode_cursor(cursor)
        # tuple_() genuinely accepts plain Python literals on the RHS at
        # runtime (keyset pagination: WHERE (start_time, id) > (?, ?)) —
        # the stubs just type its params as column expressions only.
        stmt = stmt.where(
            tuple_(Quest.start_time, Quest.id) > tuple_(cursor_time, cursor_id)  # type: ignore[arg-type]
        )

    quests = (await db.scalars(stmt)).all()
    return [
        QuestSummaryOut(
            id=q.id,
            title=q.title,
            category_key=q.category.key,
            location_city=q.location.city,
            start_time=q.start_time,
            budget_amount=q.budget_amount,
            currency=q.currency,
            max_participants=q.max_participants,
            joined_count=len([p for p in q.participants if p.status != ParticipantStatus.left]),
            difficulty=q.difficulty,
            status=q.status,
            xp_reward=q.xp_reward,
        )
        for q in quests
    ]


@router.get("/nearby", response_model=list[QuestSummaryOut])
async def nearby_quests(
    current_user: CurrentUser,
    db: DbSession,
    lat: float = Query(ge=-90, le=90),
    lng: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=10, gt=0, le=200),
    limit: int = Query(default=20, le=50, ge=1),
) -> list[QuestSummaryOut]:
    min_lat, max_lat, min_lng, max_lng = quest_service.bounding_box(lat, lng, radius_km)
    stmt = (
        select(Quest)
        .join(Location)
        .options(selectinload(Quest.location), selectinload(Quest.category), selectinload(Quest.participants))
        .where(
            Quest.deleted_at.is_(None),
            Quest.status == QuestStatus.open,
            Location.lat.between(min_lat, max_lat),
            Location.lng.between(min_lng, max_lng),
        )
    )
    candidates = (await db.scalars(stmt)).all()

    scored = []
    for q in candidates:
        dist = quest_service.haversine_km(lat, lng, q.location.lat, q.location.lng)
        if dist <= radius_km:
            scored.append((dist, q))
    scored.sort(key=lambda pair: pair[0])

    return [
        QuestSummaryOut(
            id=q.id,
            title=q.title,
            category_key=q.category.key,
            location_city=q.location.city,
            start_time=q.start_time,
            budget_amount=q.budget_amount,
            currency=q.currency,
            max_participants=q.max_participants,
            joined_count=len([p for p in q.participants if p.status != ParticipantStatus.left]),
            difficulty=q.difficulty,
            status=q.status,
            xp_reward=q.xp_reward,
            distance_km=round(dist, 2),
        )
        for dist, q in scored[:limit]
    ]


@router.get("/{quest_id}", response_model=QuestOut)
async def get_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> QuestOut:
    quest = await _get_quest_or_404(db, quest_id)
    return await _to_quest_out(db, quest, current_user_id=current_user.id)


@router.patch("/{quest_id}", response_model=QuestOut)
async def update_quest(quest_id: UUID, body: QuestUpdate, current_user: CurrentUser, db: DbSession) -> QuestOut:
    quest = await _get_quest_or_404(db, quest_id)
    if quest.creator_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the creator can edit this quest")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(quest, field, value)
    await db.commit()
    return await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)


@router.delete("/{quest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> None:
    quest = await _get_quest_or_404(db, quest_id)
    if quest.creator_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the creator can delete this quest")
    quest.deleted_at = datetime.now(UTC)
    quest.status = QuestStatus.cancelled
    await db.commit()


@router.post("/{quest_id}/join", response_model=QuestOut)
async def join_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> QuestOut:
    quest = await _get_quest_or_404(db, quest_id)

    active = [p for p in quest.participants if p.status != ParticipantStatus.left]
    if any(p.user_id == current_user.id for p in active):
        raise HTTPException(status.HTTP_409_CONFLICT, "Already joined")
    if len(active) >= quest.max_participants:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quest is full")
    if quest.status != QuestStatus.open:
        raise HTTPException(status.HTTP_409_CONFLICT, "Quest is not open for joining")

    existing = await db.scalar(
        select(QuestParticipant).where(
            QuestParticipant.quest_id == quest_id, QuestParticipant.user_id == current_user.id
        )
    )
    if existing is not None:
        existing.status = ParticipantStatus.joined
    else:
        db.add(QuestParticipant(quest_id=quest_id, user_id=current_user.id))

    await db.flush()
    if len(active) + 1 >= quest.max_participants:
        quest.status = QuestStatus.full
    await db.commit()

    return await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)


@router.post("/{quest_id}/leave", response_model=QuestOut)
async def leave_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> QuestOut:
    quest = await _get_quest_or_404(db, quest_id)
    participant = await db.scalar(
        select(QuestParticipant).where(
            QuestParticipant.quest_id == quest_id, QuestParticipant.user_id == current_user.id
        )
    )
    if participant is not None and participant.status != ParticipantStatus.left:
        participant.status = ParticipantStatus.left
        if quest.status == QuestStatus.full:
            quest.status = QuestStatus.open
        await db.commit()

    return await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)


@router.post("/{quest_id}/checkin", response_model=QuestOut)
async def checkin_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> QuestOut:
    participant = await db.scalar(
        select(QuestParticipant).where(
            QuestParticipant.quest_id == quest_id,
            QuestParticipant.user_id == current_user.id,
            QuestParticipant.status != ParticipantStatus.left,
        )
    )
    if participant is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You haven't joined this quest")
    participant.status = ParticipantStatus.checked_in
    participant.checked_in_at = datetime.now(UTC)
    await db.commit()

    return await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)


@router.post("/{quest_id}/objectives/{objective_id}/complete", response_model=QuestOut)
async def complete_objective(
    quest_id: UUID, objective_id: UUID, current_user: CurrentUser, db: DbSession
) -> QuestOut:
    objective = await db.get(QuestObjective, objective_id)
    if objective is None or objective.quest_id != quest_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Objective not found")

    existing = await db.scalar(
        select(QuestObjectiveCompletion).where(
            QuestObjectiveCompletion.objective_id == objective_id,
            QuestObjectiveCompletion.user_id == current_user.id,
        )
    )
    if existing is None:
        db.add(
            QuestObjectiveCompletion(
                objective_id=objective_id,
                user_id=current_user.id,
                verified=True,
                verified_at=datetime.now(UTC),
                verification_method="manual",
            )
        )
        await db.commit()

    return await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)


@router.post("/{quest_id}/complete", response_model=QuestOut)
async def complete_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> QuestOut:
    quest = await _get_quest_or_404(db, quest_id)
    participant = next((p for p in quest.participants if p.user_id == current_user.id), None)
    if participant is None or participant.status == ParticipantStatus.left:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You haven't joined this quest")

    required_ids = {o.id for o in quest.objectives if o.is_required}
    if required_ids:
        done = await db.scalars(
            select(QuestObjectiveCompletion.objective_id).where(
                QuestObjectiveCompletion.user_id == current_user.id,
                QuestObjectiveCompletion.objective_id.in_(required_ids),
            )
        )
        if required_ids - set(done.all()):
            raise HTTPException(status.HTTP_409_CONFLICT, "Required objectives are not all complete")

    already = await db.scalar(
        select(QuestCompletion).where(
            QuestCompletion.quest_id == quest_id, QuestCompletion.user_id == current_user.id
        )
    )
    if already is None:
        participant.status = ParticipantStatus.completed
        participant.completed_at = datetime.now(UTC)
        db.add(
            QuestCompletion(
                quest_id=quest_id,
                user_id=current_user.id,
                completed_at=datetime.now(UTC),
                xp_awarded=quest.xp_reward,
            )
        )
        await award_xp(db, user_id=current_user.id, delta=quest.xp_reward, reason="quest_completion", related_quest_id=quest_id)
        await _maybe_unlock_first_quest_achievement(db, current_user.id)

        remaining_active = [
            p for p in quest.participants if p.status not in (ParticipantStatus.left, ParticipantStatus.completed)
        ]
        if not remaining_active:
            quest.status = QuestStatus.completed
        await db.commit()

    return await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)


async def _maybe_unlock_first_quest_achievement(db: DbSession, user_id: UUID) -> None:
    achievement = await db.scalar(select(Achievement).where(Achievement.key == "achievement.firstQuest"))
    if achievement is None:
        return
    already = await db.scalar(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id, UserAchievement.achievement_id == achievement.id
        )
    )
    if already is None:
        completed_count = await db.scalar(
            select(func.count()).select_from(QuestCompletion).where(QuestCompletion.user_id == user_id)
        )
        if completed_count and completed_count >= 1:
            db.add(UserAchievement(user_id=user_id, achievement_id=achievement.id))
