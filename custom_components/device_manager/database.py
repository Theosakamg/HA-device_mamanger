"""Database manager for Device Manager."""

import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

import aiosqlite

_LOGGER = logging.getLogger(__name__)


class DatabaseManager:
    """Manage SQLite database for devices."""

    def __init__(self, db_path: Path):
        """Initialize database manager."""
        self.db_path = db_path
        _LOGGER.info("Database path: %s", self.db_path)

    async def initialize(self) -> None:
        """Create database tables if they don't exist."""
        try:
            # Ensure parent directory exists
            self.db_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    CREATE TABLE IF NOT EXISTS devices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )
                await db.commit()
                _LOGGER.info("Database initialized successfully")
        except Exception as err:
            _LOGGER.error("Failed to initialize database: %s", err)
            raise

    async def create_device(self, name: str) -> int:
        """Create a new device."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(
                    "INSERT INTO devices (name) VALUES (?)", (name,)
                )
                await db.commit()
                device_id = cursor.lastrowid
                if device_id is None:
                    raise ValueError("Failed to get device ID")
                _LOGGER.info("Created device: %s (ID: %d)", name, device_id)
                return device_id
        except Exception as err:
            _LOGGER.error("Failed to create device: %s", err)
            raise

    async def get_devices(self) -> List[Dict[str, Any]]:
        """Get all devices."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute(
                    """SELECT id, name, created_at, updated_at
                    FROM devices ORDER BY id DESC"""
                )
                rows = await cursor.fetchall()
                devices = [dict(row) for row in rows]
                _LOGGER.debug("Retrieved %d devices", len(devices))
                return devices
        except Exception as err:
            _LOGGER.error("Failed to get devices: %s", err)
            raise

    async def get_device(self, device_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific device by ID."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute(
                    """SELECT id, name, created_at, updated_at
                    FROM devices WHERE id = ?""",
                    (device_id,),
                )
                row = await cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except Exception as err:
            _LOGGER.error("Failed to get device %d: %s", device_id, err)
            raise

    async def update_device(self, device_id: int, name: str) -> bool:
        """Update a device."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """UPDATE devices SET name = ?,
                    updated_at = CURRENT_TIMESTAMP WHERE id = ?""",
                    (name, device_id),
                )
                await db.commit()
                _LOGGER.info("Updated device %d: %s", device_id, name)
                return True
        except Exception as err:
            _LOGGER.error("Failed to update device %d: %s", device_id, err)
            raise

    async def delete_device(self, device_id: int) -> bool:
        """Delete a device."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute("DELETE FROM devices WHERE id = ?", (device_id,))
                await db.commit()
                _LOGGER.info("Deleted device %d", device_id)
                return True
        except Exception as err:
            _LOGGER.error("Failed to delete device %d: %s", device_id, err)
            raise
