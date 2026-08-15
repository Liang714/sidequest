"""Import every model module so Base.metadata sees all tables — required for
Alembic autogenerate and for `Base.metadata.create_all` in tests.
"""

from app.models import gamification, identity, quests, social

__all__ = ["gamification", "identity", "quests", "social"]
