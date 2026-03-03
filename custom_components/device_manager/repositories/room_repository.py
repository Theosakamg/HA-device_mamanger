"""Repository for DmRoom entities."""

from typing import Any, Optional

from .base import BaseRepository
from ..services.database_manager import DatabaseManager
from ..utils.crypto import encrypt, decrypt


class RoomRepository(BaseRepository):
    """Repository for managing DmRoom records in dm_rooms table."""

    table_name = "dm_rooms"
    allowed_columns = {"name", "slug", "description", "image", "floor_id", "login", "password"}
    parent_column = "floor_id"

    def __init__(self, db_manager: DatabaseManager, crypto_key: Optional[str] = None) -> None:
        """Initialize with a shared DatabaseManager and optional encryption key.

        Args:
            db_manager: The database manager providing the shared connection.
            crypto_key: Fernet key (URL-safe base64, 44 chars) used to
                encrypt the ``password`` field at rest.  When ``None``
                the password is stored as-is (not recommended).
        """
        super().__init__(db_manager)
        self._crypto_key = crypto_key

    # ------------------------------------------------------------------
    # Crypto hooks
    # ------------------------------------------------------------------

    def _decode_row(self, row: dict[str, Any]) -> dict[str, Any]:
        """Decrypt password field after reading from DB."""
        if self._crypto_key and row.get("password"):
            row = dict(row)
            row["password"] = decrypt(row["password"], self._crypto_key)
        return row

    def _encode_row(self, data: dict[str, Any]) -> dict[str, Any]:
        """Encrypt password field before writing to DB."""
        if self._crypto_key and data.get("password"):
            data = dict(data)
            data["password"] = encrypt(data["password"], self._crypto_key)
        return data

    # ------------------------------------------------------------------
    # Filters
    # ------------------------------------------------------------------

    async def find_by_floor(self, floor_id: int) -> list[dict[str, Any]]:
        """Find all rooms belonging to a specific floor.

        Args:
            floor_id: The floor ID to filter by.

        Returns:
            A list of room dicts with password already decrypted.
        """
        return await self.find_by_parent(floor_id)
