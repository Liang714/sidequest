import base64
import binascii
from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, tuple_
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession, RateLimit
from app.models.business import Business, BusinessQuest
from app.models.commerce import CreatorQuest
from app.models.identity import Interest, Profile, User, UserInterest
from app.models.quests import (
    Location,
    ParticipantStatus,
    Quest,
    QuestCategory,
    QuestCompletion,
    QuestObjective,
    QuestObjectiveCompletion,
    QuestParticipant,
    QuestPhoto,
    QuestStatus,
)
from app.schemas.gamification import AchievementOut
from app.schemas.quests import (
    CompatibilityBreakdownOut,
    CompatibilityOut,
    LocationOut,
    ObjectiveOut,
    ParticipantOut,
    QuestCompleteOut,
    QuestCreate,
    QuestOut,
    QuestSummaryOut,
    QuestUpdate,
    SponsorInfoOut,
)
from app.schemas.vision import VerifyPhotoOut, VerifyPhotoRequest, VisionVerificationOut
from app.services import analytics_service, quest_service
from app.services.achievement_service import evaluate_and_unlock_achievements
from app.services.compatibility_service import compute_compatibility
from app.services.xp_service import award_xp
from app.storage import StorageProvider, get_storage_provider
from app.vision.base import VisionVerificationError, VisionVerifier
from app.vision.service import get_vision_verifier

router = APIRouter(prefix="/quests", tags=["quests"])

StorageProviderDep = Annotated[StorageProvider, Depends(get_storage_provider)]
VisionVerifierDep = Annotated[VisionVerifier, Depends(get_vision_verifier)]


async def _require_active_participant(db: DbSession, quest_id: UUID, user_id: UUID) -> None:
    """Gate for the two per-objective completion endpoints below — mirrors
    the participation check /complete already had, which those two didn't
    (found during a security review: without this, anyone authenticated
    could call either endpoint for ANY quest they'd never joined, writing
    a QuestObjectiveCompletion row before ever becoming a participant.
    That row then satisfies /complete's "all required objectives done"
    check the moment they *do* join — self-report becomes no-report).
    """
    participant = await db.scalar(
        select(QuestParticipant).where(
            QuestParticipant.quest_id == quest_id,
            QuestParticipant.user_id == user_id,
            QuestParticipant.status != ParticipantStatus.left,
        )
    )
    if participant is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You haven't joined this quest")


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


async def _sponsor_info(db: DbSession, quest_id: UUID) -> SponsorInfoOut | None:
    """Populated only for quests created via POST /businesses/{id}/quests
    (Phase 5) — see app/routers/business.py and SponsorInfoOut's docstring."""
    bq = await db.scalar(select(BusinessQuest).where(BusinessQuest.quest_id == quest_id))
    if bq is None:
        return None
    business = await db.get(Business, bq.business_id)
    if business is None:
        return None
    return SponsorInfoOut(
        business_id=business.id,
        business_name=business.name,
        sponsorship_type=bq.sponsorship_type,
        discount_details=bq.discount_details,
    )


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
        sponsor=await _sponsor_info(db, quest.id),
    )


@router.post("", response_model=QuestOut, status_code=status.HTTP_201_CREATED)
async def create_quest(
    body: QuestCreate, current_user: CurrentUser, db: DbSession, _rl: None = RateLimit("quest-create", 10)
) -> QuestOut:
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
        .where(
            Quest.deleted_at.is_(None),
            Quest.status == QuestStatus.open,
            # Creator marketplace quests (Phase 6) are paywalled — they
            # don't appear in free discovery, only in GET /marketplace/quests.
            Quest.id.not_in(select(CreatorQuest.quest_id)),
        )
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


@router.get("/mine", response_model=list[QuestSummaryOut])
async def my_quests(current_user: CurrentUser, db: DbSession) -> list[QuestSummaryOut]:
    """Quests the current user created or is (or was) an active participant
    in — across every status, not just 'open'. Not in the original
    docs/API.md endpoint table; added once the web app needed a real
    "My Quests" listing and there was no way to ask for one.
    """
    participant_quest_ids = select(QuestParticipant.quest_id).where(
        QuestParticipant.user_id == current_user.id,
        QuestParticipant.status.in_(
            [ParticipantStatus.joined, ParticipantStatus.checked_in, ParticipantStatus.completed]
        ),
    )
    stmt = (
        select(Quest)
        .options(selectinload(Quest.location), selectinload(Quest.category), selectinload(Quest.participants))
        .where(
            Quest.deleted_at.is_(None),
            (Quest.creator_id == current_user.id) | (Quest.id.in_(participant_quest_ids)),
        )
        .order_by(Quest.start_time.desc())
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
            # See the same exclusion note in list_quests above.
            Quest.id.not_in(select(CreatorQuest.quest_id)),
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


@router.get("/recommended", response_model=list[QuestSummaryOut])
async def recommended_quests(
    current_user: CurrentUser,
    db: DbSession,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    limit: int = Query(default=10, le=30, ge=1),
) -> list[QuestSummaryOut]:
    """"For You" — open quests ranked by compute_compatibility, the same
    scoring GET /quests/{id}/compatibility exposes per-quest. This is the
    "content-based" step from docs/AI.md's recommendation ladder — real
    ranking logic, just not embedding/pgvector-backed (see docs/DATABASE.md
    for why pgvector isn't available on this dev machine yet). No LLM call
    is on this path, deliberately — see docs/AI.md §Recommendations.
    """
    interest_rows = await db.scalars(
        select(Interest.category).join(UserInterest, UserInterest.interest_id == Interest.id).where(
            UserInterest.user_id == current_user.id
        )
    )
    user_interest_categories = set(interest_rows.all())

    stmt = (
        select(Quest)
        .options(selectinload(Quest.location), selectinload(Quest.category), selectinload(Quest.participants))
        .where(
            Quest.deleted_at.is_(None),
            Quest.status == QuestStatus.open,
            # See the same exclusion note in list_quests above.
            Quest.id.not_in(select(CreatorQuest.quest_id)),
        )
        .order_by(Quest.start_time.asc())
        .limit(200)  # candidate pool — fine at MVP scale, see docs/AI.md
    )
    candidates = (await db.scalars(stmt)).all()

    scored = []
    for q in candidates:
        joined = len([p for p in q.participants if p.status != ParticipantStatus.left])
        result = compute_compatibility(
            user_interest_category_keys=user_interest_categories,
            quest_category_key=q.category.key.removeprefix("category."),
            user_lat=lat,
            user_lng=lng,
            quest_lat=q.location.lat,
            quest_lng=q.location.lng,
            joined_count=joined,
            max_participants=q.max_participants,
        )
        scored.append((result.score, joined, q))
    scored.sort(key=lambda triple: triple[0], reverse=True)

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
            joined_count=joined,
            difficulty=q.difficulty,
            status=q.status,
            xp_reward=q.xp_reward,
        )
        for _, joined, q in scored[:limit]
    ]


@router.get("/{quest_id}", response_model=QuestOut)
async def get_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> QuestOut:
    quest = await _get_quest_or_404(db, quest_id)

    creator_quest = await db.scalar(select(CreatorQuest).where(CreatorQuest.quest_id == quest_id))
    if creator_quest is not None and quest.creator_id != current_user.id:
        is_purchaser = any(
            p.user_id == current_user.id and p.status != ParticipantStatus.left for p in quest.participants
        )
        if not is_purchaser:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED, "Purchase this quest via the marketplace to view it"
            )

    # The "views" half of business analytics (app/services/business_service.py)
    # reads this — logged here specifically (not inside _to_quest_out, which
    # every mutation handler also calls internally to build its response)
    # so it only counts an actual detail-page open, not every post-mutation refetch.
    analytics_service.log_event(db, event_type="quest_viewed", user_id=current_user.id, payload={"quest_id": str(quest_id)})
    await db.commit()
    return await _to_quest_out(db, quest, current_user_id=current_user.id)


@router.get("/{quest_id}/compatibility", response_model=CompatibilityOut)
async def get_compatibility(
    quest_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
) -> CompatibilityOut:
    quest = await _get_quest_or_404(db, quest_id)
    interest_rows = await db.scalars(
        select(Interest.category).join(UserInterest, UserInterest.interest_id == Interest.id).where(
            UserInterest.user_id == current_user.id
        )
    )
    joined = len([p for p in quest.participants if p.status != ParticipantStatus.left])
    result = compute_compatibility(
        user_interest_category_keys=set(interest_rows.all()),
        quest_category_key=quest.category.key.removeprefix("category."),
        user_lat=lat,
        user_lng=lng,
        quest_lat=quest.location.lat,
        quest_lng=quest.location.lng,
        joined_count=joined,
        max_participants=quest.max_participants,
    )
    return CompatibilityOut(
        score=result.score,
        breakdown=[CompatibilityBreakdownOut(label_key=b.label_key, points=b.points) for b in result.breakdown],
    )


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

    is_marketplace_quest = await db.scalar(select(CreatorQuest).where(CreatorQuest.quest_id == quest_id))
    if is_marketplace_quest is not None:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "This is a paid marketplace quest — purchase it via POST /marketplace/{quest_id}/purchase instead of joining directly",
        )

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
    quest_id: UUID,
    objective_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
    _rl: None = RateLimit("objective-complete", 30),
) -> QuestOut:
    objective = await db.get(QuestObjective, objective_id)
    if objective is None or objective.quest_id != quest_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Objective not found")
    await _require_active_participant(db, quest_id, current_user.id)

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


@router.post("/{quest_id}/objectives/{objective_id}/verify-photo", response_model=VerifyPhotoOut)
async def verify_photo_objective(
    quest_id: UUID,
    objective_id: UUID,
    body: VerifyPhotoRequest,
    current_user: CurrentUser,
    db: DbSession,
    storage: StorageProviderDep,
    verifier: VisionVerifierDep,
    _rl: None = RateLimit("objective-verify-photo", 15),
) -> VerifyPhotoOut:
    """The photo-objective equivalent of /complete — completes the
    objective (self-report, same honor-system baseline every other
    objective already runs on) *and* attaches an AI opinion on whether the
    photo actually matches, for transparency. The AI's opinion is
    advisory only: `ai_verification.matches=False` does NOT block
    completion or withhold XP — see docs/AI.md §VisionVerifier for why
    (measured accuracy isn't good enough to safely gate on yet) and
    docs/ROADMAP.md Phase 8's exit criteria this satisfies.
    """
    objective = await db.get(QuestObjective, objective_id)
    if objective is None or objective.quest_id != quest_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Objective not found")
    await _require_active_participant(db, quest_id, current_user.id)

    try:
        image_bytes = base64.b64decode(body.image_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid base64 image data") from exc
    if not image_bytes or len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Image must be non-empty and under 8MB")

    storage_key = await storage.save(content=image_bytes, content_type=body.content_type, key_prefix=f"quest-photos/{quest_id}")
    photo = QuestPhoto(quest_id=quest_id, user_id=current_user.id, storage_key=storage_key)
    db.add(photo)
    await db.flush()

    ai_verification: VisionVerificationOut | None = None
    try:
        result = await verifier.verify(image_bytes=image_bytes, objective_description=objective.description)
        ai_verification = VisionVerificationOut(
            matches=result.matches, confidence=result.confidence, explanation=result.explanation, provider=verifier.name
        )
    except VisionVerificationError:
        # Advisory feature failing (model unreachable, bad output) doesn't
        # block completion — the photo's still saved and the objective
        # still completes; ai_verification is just absent from the response.
        pass

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
                evidence_photo_id=photo.id,
                verified=True,  # completion is still self-report — see docstring above
                verified_at=datetime.now(UTC),
                verification_method="photo",
            )
        )
    await db.commit()

    quest_out = await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)
    updated_objective = next(o for o in quest_out.objectives if o.id == objective_id)
    return VerifyPhotoOut(
        objective=updated_objective,
        photo_url=storage.public_url(storage_key),
        ai_verification=ai_verification,
    )


@router.post("/{quest_id}/complete", response_model=QuestCompleteOut)
async def complete_quest(quest_id: UUID, current_user: CurrentUser, db: DbSession) -> QuestCompleteOut:
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
    xp_awarded = 0
    new_level: int | None = None
    new_achievements: list[AchievementOut] = []
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

        profile_before = await db.get(Profile, current_user.id)
        assert profile_before is not None
        level_before = profile_before.level

        await award_xp(db, user_id=current_user.id, delta=quest.xp_reward, reason="quest_completion", related_quest_id=quest_id)
        xp_awarded = quest.xp_reward

        # Flush so the achievement engine's query sees this QuestCompletion row.
        await db.flush()
        unlocked = await evaluate_and_unlock_achievements(db, current_user.id)
        new_achievements = [
            AchievementOut(key=a.key, icon=a.icon, unlocked=True, unlocked_at=ts) for a, ts in unlocked
        ]

        profile_after = await db.get(Profile, current_user.id)
        assert profile_after is not None
        if profile_after.level > level_before:
            new_level = profile_after.level

        remaining_active = [
            p for p in quest.participants if p.status not in (ParticipantStatus.left, ParticipantStatus.completed)
        ]
        if not remaining_active:
            quest.status = QuestStatus.completed
        await db.commit()

    quest_out = await _to_quest_out(db, await _get_quest_or_404(db, quest_id), current_user_id=current_user.id)
    return QuestCompleteOut(
        quest=quest_out, xp_awarded=xp_awarded, new_level=new_level, new_achievements=new_achievements
    )
