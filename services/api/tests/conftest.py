"""Test fixtures.

Runs against a real Postgres (`sidequest_test`, created alongside the dev
`sidequest` DB — see README) rather than SQLite, per docs/ARCHITECTURE.md's
"use real Postgres, not a dialect-different stand-in" stance.

Each request gets its own session, exactly like production (`Depends(get_db)`
is left untouched) — an earlier version of this file shared one session/
connection between the test and the app to get transaction-rollback
isolation, but that fought asyncpg's "one operation at a time per
connection" rule the moment a test made more than one sequential request
and produced flaky `InterfaceError: another operation is in progress`
failures. Truncating tables after each test is less clever but reliable.
"""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.db as db_module
from app.config import get_settings
from app.db import Base
from app.main import app
from app.models.gamification import Achievement
from app.models.identity import Interest
from app.models.quests import QuestCategory

_base_url = get_settings().database_url.rsplit("/", 1)[0]
TEST_DATABASE_URL = f"{_base_url}/sidequest_test"

# Repoint the app's own engine/session factory at the test DB for the
# whole session — app/deps.py's get_db() resolves these module globals at
# call time, so every request made through `client` below lands here.
db_module.engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
db_module.SessionLocal = async_sessionmaker(db_module.engine, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _setup_schema():
    async with db_module.engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await db_module.engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def _clean_tables():
    yield
    async with db_module.engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


@pytest_asyncio.fixture
async def seed_reference_data():
    """The minimum reference rows quest creation depends on — mirrors
    app/seed.py's real categories/achievements without depending on the
    dev DB's state."""
    async with db_module.SessionLocal() as session:
        session.add(QuestCategory(key="category.photography", icon="📸", sort_order=0))
        session.add(QuestCategory(key="category.dance", icon="💃", sort_order=1))
        session.add(QuestCategory(key="category.food", icon="🍜", sort_order=2))
        session.add(Interest(key="category.photography", category="photography"))
        session.add(Achievement(key="achievement.firstQuest", icon="🏆", criteria={"quests_completed": 1}))
        session.add(
            Achievement(
                key="achievement.nightOwl", icon="🌙", criteria={"quest_started_after_hour": 21}
            )
        )
        session.add(
            Achievement(
                key="achievement.photographer",
                icon="📸",
                criteria={"category": "photography", "quests_completed": 1},
            )
        )
        session.add(
            Achievement(
                key="achievement.foodHunter", icon="🍜", criteria={"category": "food", "quests_completed": 1}
            )
        )
        session.add(Achievement(key="achievement.explorer", icon="🗺️", criteria={"unique_locations": 5}))
        await session.commit()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as ac:
        yield ac


async def register(client: AsyncClient, *, email: str, username: str) -> dict:
    resp = await client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "password": "correcthorsebattery",
            "display_name": username.capitalize(),
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def auth_headers(token_pair: dict) -> dict:
    return {"Authorization": f"Bearer {token_pair['access_token']}"}
