"""API controller for user-configurable settings."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from ..const import DEFAULT_SETTINGS, DOMAIN

_LOGGER = logging.getLogger(__name__)


class SettingsAPIView(HomeAssistantView):
    """GET / PUT endpoint for application settings."""

    url = "/api/device_manager/settings"
    name = "api:device_manager:settings"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Return all settings as a JSON object.

        Missing keys are seeded from DEFAULT_SETTINGS automatically.
        """
        try:
            hass = request.app["hass"]
            repo = hass.data[DOMAIN]["repos"]["settings"]
            settings = await repo.get_all()
            return self.json(settings)
        except Exception as err:
            _LOGGER.error("Failed to load settings: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request) -> web.Response:
        """Update one or more settings.

        Expects a JSON body with ``{key: value}`` pairs.  Only known
        setting keys (those in ``DEFAULT_SETTINGS``) are accepted.

        Returns the full settings dict after update.
        """
        try:
            body = await request.json()
        except Exception:
            return self.json(
                {"error": "Invalid JSON body"}, status_code=400
            )

        # Filter to known keys only
        allowed = set(DEFAULT_SETTINGS.keys())
        filtered = {
            k: str(v) for k, v in body.items() if k in allowed
        }
        if not filtered:
            return self.json(
                {"error": "No valid setting keys provided"},
                status_code=400,
            )

        try:
            hass = request.app["hass"]
            repo = hass.data[DOMAIN]["repos"]["settings"]
            result = await repo.set_many(filtered)
            _LOGGER.info("Settings updated: %s", list(filtered.keys()))
            return self.json(result)
        except Exception as err:
            _LOGGER.error("Failed to update settings: %s", err)
            return self.json({"error": str(err)}, status_code=500)
