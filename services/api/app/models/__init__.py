"""Import every model module so Base.metadata sees all tables — required for
Alembic autogenerate and for `Base.metadata.create_all` in tests.
"""

from app.models import ai, gamification, identity, quests, social

__all__ = ["ai", "gamification", "identity", "quests", "social"]
