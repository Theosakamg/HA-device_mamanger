"""Repository for DmRoom entities."""

from typing import Any

from .base import BaseRepository


class RoomRepository(BaseRepository):
    """Repository for managing DmRoom records in dm_rooms table."""

    table_name = "dm_rooms"
    allowed_columns = {"name", "slug", "description", "image", "level_id"}
    parent_column = "level_id"

    async def find_by_level(self, level_id: int) -> list[dict[str, Any]]:
        """Find all rooms belonging to a specific level.

        Args:
            level_id: The level ID to filter by.

        Returns:
            A list of room dicts.
        """
        return await self.find_by_parent(level_id)
