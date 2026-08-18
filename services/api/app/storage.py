"""StorageProvider abstraction — see docs/ARCHITECTURE.md provider-
abstraction pattern (same idea as the AI/maps/payments seams).

`LocalDiskStorageProvider` is the dev default AND the production-safe
default until real object storage is configured — same posture as every
other provider abstraction here (AI_PROVIDER=fake, PAYMENT_PROVIDER=fake
before real keys exist). `S3StorageProvider` is real and ready for
Cloudflare R2 (S3-API-compatible, zero egress fees — see
docs/ARCHITECTURE.md's technology table for why R2 over raw S3) or MinIO;
set STORAGE_PROVIDER=s3 + the matching credentials once a bucket exists.
See docs/DEPLOYMENT.md.
"""

from pathlib import Path
from typing import Protocol
from uuid import uuid4

from app.config import get_settings

settings = get_settings()

_EXT_BY_CONTENT_TYPE = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


class StorageProvider(Protocol):
    async def save(self, *, content: bytes, content_type: str, key_prefix: str) -> str:
        """Persists content, returns a storage_key."""
        ...

    def public_url(self, storage_key: str) -> str:
        ...


class LocalDiskStorageProvider:
    def __init__(self, base_dir: str) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, *, content: bytes, content_type: str, key_prefix: str) -> str:
        ext = _EXT_BY_CONTENT_TYPE.get(content_type, "bin")
        key = f"{key_prefix}/{uuid4()}.{ext}"
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return key

    def public_url(self, storage_key: str) -> str:
        # Must include /api/v1: app.mount() in app/main.py registers this
        # route on the same FastAPI app as everything else, and FastAPI's
        # root_path="/api/v1" only gets applied to APIRouter-registered
        # routes automatically, not to a raw Starlette Mount — a bare
        # `/local-storage/...` request 404s against the real running
        # server even though the mount itself is correctly configured
        # (confirmed live while prepping the Fly.io deploy: /api/v1/
        # local-storage/... -> 200, bare /local-storage/... -> 404). See
        # tests/test_vision.py's photo_url regression check for the
        # up-to-date empirical proof, since this is exactly the kind of
        # thing that's easy to get backwards again later.
        return f"/api/v1/local-storage/{storage_key}"


class S3StorageProvider:
    """Real, working implementation — not speculative — against any
    S3-API-compatible bucket (Cloudflare R2, MinIO, real AWS S3). Needs a
    real bucket + credentials to actually store anything (see
    docs/DEPLOYMENT.md); this class itself has no fake/local fallback
    baked in, that's what STORAGE_PROVIDER=local (the default) is for.
    """

    def __init__(
        self, *, endpoint_url: str, bucket: str, access_key_id: str, secret_access_key: str, public_base_url: str
    ) -> None:
        self.endpoint_url = endpoint_url
        self.bucket = bucket
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.public_base_url = public_base_url.rstrip("/")

    async def save(self, *, content: bytes, content_type: str, key_prefix: str) -> str:
        import aioboto3  # type: ignore[import-untyped]  # no published type stubs

        ext = _EXT_BY_CONTENT_TYPE.get(content_type, "bin")
        key = f"{key_prefix}/{uuid4()}.{ext}"

        session = aioboto3.Session()
        async with session.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
        ) as s3:
            await s3.put_object(Bucket=self.bucket, Key=key, Body=content, ContentType=content_type)
        return key

    def public_url(self, storage_key: str) -> str:
        # A real object-storage URL, not routed through the API app at
        # all — a CDN/bucket URL (R2 public bucket, or a custom domain in
        # front of it) unlike LocalDiskStorageProvider's /api/v1/... mount.
        return f"{self.public_base_url}/{storage_key}"


def get_storage_provider() -> StorageProvider:
    if settings.storage_provider == "s3":
        if not (settings.storage_endpoint and settings.storage_public_base_url):
            raise RuntimeError(
                "STORAGE_PROVIDER=s3 but STORAGE_ENDPOINT/STORAGE_PUBLIC_BASE_URL "
                "are not set — see .env.example and docs/DEPLOYMENT.md"
            )
        return S3StorageProvider(
            endpoint_url=settings.storage_endpoint,
            bucket=settings.storage_bucket,
            access_key_id=settings.storage_access_key_id,
            secret_access_key=settings.storage_secret_access_key,
            public_base_url=settings.storage_public_base_url,
        )
    return LocalDiskStorageProvider(settings.storage_local_dir)
