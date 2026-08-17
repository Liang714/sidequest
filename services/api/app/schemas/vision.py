from pydantic import BaseModel, Field

from app.schemas.quests import ObjectiveOut


class VerifyPhotoRequest(BaseModel):
    image_base64: str = Field(min_length=1)
    content_type: str = Field(default="image/jpeg", pattern=r"^image/(jpeg|png|webp)$")


class VisionVerificationOut(BaseModel):
    matches: bool
    confidence: float
    explanation: str
    provider: str


class VerifyPhotoOut(BaseModel):
    objective: ObjectiveOut
    # Relative to the API's own origin, not apps/web's — the browser
    # combines this with NEXT_PUBLIC_API_ORIGIN to render the photo
    # directly (see app/main.py's StaticFiles mount for LocalDiskStorageProvider).
    photo_url: str
    # None only if the vision call itself failed (provider unreachable,
    # bad output) — the photo/objective completion still goes through
    # either way, since this is advisory, never a gate. See
    # docs/AI.md §VisionVerifier.
    ai_verification: VisionVerificationOut | None = None
