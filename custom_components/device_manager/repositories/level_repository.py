"""Repository for DmLevel entities."""

from typing import Any

from .base import BaseRepository


class LevelRepository(BaseRepository):
    """Repository for managing DmLevel records in dm_levels table.

    Levels are always sorted by ``slug`` so that the natural floor
    order (l0, l1, l2 …) is preserved regardless of insertion order.
    """

    table_name = "dm_levels"
    allowed_columns = {"name", "slug", "description", "image", "home_id"}
    parent_column = "home_id"
    default_order = "slug ASC"

    async def find_all(self) -> list[dict[str, Any]]:
        """Retrieve all levels ordered by slug.

        Returns:
            A list of level dicts sorted by slug.
        """
        conn = await self.db.get_connection()
        cursor = await conn.execute(
            f"SELECT * FROM {self.table_name}"
            f" ORDER BY {self.default_order}"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def find_by_home(self, home_id: int) -> list[dict[str, Any]]:
        """Find all levels belonging to a specific home.

        Args:
            home_id: The home ID to filter by.

        Returns:
            A list of level dicts sorted by slug.
        """
        conn = await self.db.get_connection()
        cursor = await conn.execute(
            f"SELECT * FROM {self.table_name}"
            f" WHERE {self.parent_column} = ?"
            f" ORDER BY {self.default_order}",
            (home_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
