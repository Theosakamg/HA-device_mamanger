"""API controller for maintenance operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class MaintenanceCleanDBAPIView(HomeAssistantView):
    """API endpoint to wipe all data from the database."""

    url = "/api/device_manager/maintenance/clean-db"
    name = "api:device_manager:maintenance:clean_db"
    requires_auth = True

    async def post(self, request: web.Request) -> web.Response:
        """Delete all data from every managed table.

        Expects JSON body with a 'confirmation' field set to
        'DELETE ALL DATA' to proceed.

        Returns:
            JSON with deletion counts per table.
        """
        try:
            body = await request.json()
        except Exception:
            body = {}

        confirmation = body.get("confirmation", "")
        if confirmation != "DELETE ALL DATA":
            return self.json(
                {"error": "Invalid confirmation phrase"},
                status_code=400,
            )

        try:
            hass = request.app["hass"]
            db_mgr = hass.data[DOMAIN]["db"]
            conn = await db_mgr.get_connection()

            # Delete in order respecting FK constraints
            tables = [
                "dm_devices",
                "dm_rooms",
                "dm_levels",
                "dm_homes",
                "dm_device_models",
                "dm_device_firmwares",
                "dm_device_functions",
            ]
            counts: dict[str, int] = {}
            for table in tables:
                cursor = await conn.execute(
                    f"DELETE FROM {table}"  # noqa: S608
                )
                counts[table] = cursor.rowcount

            # Reset autoincrement counters (sqlite_sequence)
            for table in tables:
                await conn.execute(
                    "DELETE FROM sqlite_sequence WHERE name = ?",
                    (table,),
                )

            await conn.commit()

            _LOGGER.warning(
                "Database cleaned: %s", counts
            )
            return self.json({
                "success": True,
                "deleted": counts,
            })
        except Exception as err:
            _LOGGER.error(
                "Database clean failed: %s", err
            )
            return self.json(
                {"error": str(err)},
                status_code=500,
            )
