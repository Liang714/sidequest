"""StorageProvider abstraction — see docs/ARCHITECTURE.md provider-
abstraction pattern (same idea as the AI/maps/payments seams).

`LocalDiskStorageProvider` is the dev default: dl.min.io was unreachable
from this environment, so instead of blocking Phase 2 on it, quest
photos/avatars just write to a local directory. Swapping to real MinIO/R2
means implementing `S3StorageProvider` against this same protocol and
flipping `settings.storage_endpoint` — no call site changes.
"""

from pathlib import Path
from typing import Protocol
from uuid import uuid4

from app.config import get_settings

settings = get_settings()


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
        ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(content_type, "bin")
        key = f"{key_prefix}/{uuid4()}.{ext}"
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return key

    def public_url(self, storage_key: str) -> str:
        return f"/local-storage/{storage_key}"


def get_storage_provider() -> StorageProvider:
    # Real S3-compatible (R2/MinIO) adapter goes here once storage_endpoint
    # is reachable — see the module docstring.
    return LocalDiskStorageProvider(settings.storage_local_dir)
