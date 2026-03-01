"""Repository for DmHome entities."""

from .base import BaseRepository


class HomeRepository(BaseRepository):
    """Repository for managing DmHome records in dm_homes table."""

    table_name = "dm_homes"
    allowed_columns = {"name", "slug", "description", "image"}
