from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import CurrentUser, DbSession
from app.payments.base import PaymentProvider
from app.payments.service import get_payment_provider
from app.schemas.commerce import SubscriptionOut
from app.services import subscription_service
from app.services.subscription_service import SubscriptionError

router = APIRouter(prefix="/subscriptions", tags=["commerce"])

PaymentProviderDep = Annotated[PaymentProvider, Depends(get_payment_provider)]


@router.get("/me", response_model=SubscriptionOut)
async def get_my_subscription(current_user: CurrentUser, db: DbSession) -> SubscriptionOut:
    return await subscription_service.get_subscription_out(db, current_user.id)


@router.post("/subscribe", response_model=SubscriptionOut)
async def subscribe(current_user: CurrentUser, db: DbSession, provider: PaymentProviderDep) -> SubscriptionOut:
    try:
        await subscription_service.subscribe(db, user_id=current_user.id, provider=provider)
    except SubscriptionError as exc:
        await db.commit()  # keep the Payment row (even a failed one) as an audit trail
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    await db.commit()
    return await subscription_service.get_subscription_out(db, current_user.id)


@router.post("/cancel", response_model=SubscriptionOut)
async def cancel(current_user: CurrentUser, db: DbSession) -> SubscriptionOut:
    try:
        await subscription_service.cancel(db, user_id=current_user.id)
    except SubscriptionError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    await db.commit()
    return await subscription_service.get_subscription_out(db, current_user.id)
