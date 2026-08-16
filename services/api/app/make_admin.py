"""One-off CLI to grant admin access — there's deliberately no admin
signup flow reachable over the API (see app/deps.py::CurrentAdmin).

Run: uv run python -m app.make_admin <email>
"""

import asyncio
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models.identity import User


async def make_admin(email: str) -> None:
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            print(f"No user with email {email}")
            return
        user.is_admin = True
        await db.commit()
        print(f"{user.username} ({email}) is now an admin.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: uv run python -m app.make_admin <email>")
        sys.exit(1)
    asyncio.run(make_admin(sys.argv[1]))
