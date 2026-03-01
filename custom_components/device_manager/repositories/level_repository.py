"""Repository for DmLevel entities."""

from typing import Any

from .base import BaseRepository


class LevelRepository(BaseRepository):
    """Repository for managing DmLevel records in dm_levels table."""

    table_name = "dm_levels"
    allowed_columns = {"name", "slug", "description", "image", "home_id"}
    parent_column = "home_id"

    async def find_by_home(self, home_id: int) -> list[dict[str, Any]]:
        """Find all levels belonging to a specific home.

        Args:
            home_id: The home ID to filter by.

        Returns:
            A list of level dicts.
        """
        return await self.find_by_parent(home_id)
