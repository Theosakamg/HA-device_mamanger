"""Database manager for Device Manager."""

import logging
from pathlib import Path
from typing import Any

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
                # Create base devices table with all persisted fields
                await db.execute(
                    """
                    CREATE TABLE IF NOT EXISTS devices (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT,
                        mac TEXT,
                        state TEXT,
                        level INTEGER DEFAULT 0,
                        room_fr TEXT,
                        position_fr TEXT,
                        function TEXT,
                        room_slug TEXT,
                        position_slug TEXT,
                        firmware TEXT,
                        model TEXT,
                        ip TEXT,
                        interlock TEXT,
                        mode TEXT,
                        target TEXT,
                        ha_device_class TEXT,
                        extra TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """
                )

                # Migration: ensure all expected columns exist (for older DBs)
                expected_columns = {
                    'name', 'mac', 'state', 'level', 'room_fr', 'position_fr', 'function',
                    'room_slug', 'position_slug', 'firmware', 'model', 'ip',
                    'interlock', 'mode', 'target', 'ha_device_class', 'extra',
                }

                cursor = await db.execute("PRAGMA table_info(devices)")
                rows = await cursor.fetchall()
                existing = {r[1] for r in rows}
                for col in expected_columns - existing:
                    # Add missing column
                    await db.execute(f"ALTER TABLE devices ADD COLUMN {col} TEXT")

                await db.commit()
                _LOGGER.info("Database initialized and migrated successfully")
        except Exception as err:
            _LOGGER.error("Failed to initialize database: %s", err)
            raise

    async def create_device(self, device: dict) -> int:
        """Create a new device with arbitrary persisted fields."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                cols = []
                vals = []
                for k, v in device.items():
                    cols.append(k)
                    vals.append(v)

                if not cols:
                    cursor = await db.execute("INSERT INTO devices DEFAULT VALUES")
                else:
                    placeholders = ",".join(["?" for _ in cols])
                    col_list = ",".join(cols)
                    cursor = await db.execute(
                        f"INSERT INTO devices ({col_list}) VALUES ({placeholders})", tuple(vals)
                    )

                await db.commit()
                raw_id = cursor.lastrowid
                if raw_id is None:
                    raise ValueError("Failed to get device ID")
                device_id: int = int(raw_id)
                _LOGGER.info("Created device (ID: %d)", device_id)
                return device_id
        except Exception as err:
            _LOGGER.error("Failed to create device: %s", err)
            raise

    async def get_devices(self) -> list[dict[str, Any]]:
        """Get all devices with all persisted fields."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("SELECT * FROM devices ORDER BY id DESC")
                rows = await cursor.fetchall()
                devices = [dict(row) for row in rows]
                _LOGGER.debug("Retrieved %d devices", len(devices))
                return devices
        except Exception as err:
            _LOGGER.error("Failed to get devices: %s", err)
            raise

    async def get_device(self, device_id: int) -> dict[str, Any] | None:
        """Get a specific device by ID with all persisted fields."""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("SELECT * FROM devices WHERE id = ?", (device_id,))
                row = await cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except Exception as err:
            _LOGGER.error("Failed to get device %d: %s", device_id, err)
            raise

    async def update_device(self, device_id: int, updates: dict) -> bool:
        """Update a device with a dict of persisted fields."""
        try:
            if not updates:
                return False
            async with aiosqlite.connect(self.db_path) as db:
                sets = []
                vals = []
                for k, v in updates.items():
                    sets.append(f"{k} = ?")
                    vals.append(v)

                sets.append("updated_at = CURRENT_TIMESTAMP")
                sql = f"UPDATE devices SET {', '.join(sets)} WHERE id = ?"
                vals.append(device_id)
                await db.execute(sql, tuple(vals))
                await db.commit()
                _LOGGER.info("Updated device %d", device_id)
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
