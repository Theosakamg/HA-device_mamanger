"""API controller for DmDevice CRUD operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import to_camel_case_dict, to_snake_case_dict, get_repos

_LOGGER = logging.getLogger(__name__)


def _normalize_device_data(snake_data: dict) -> dict:
    """Normalize nullable fields: convert empty strings to None.

    This prevents UNIQUE constraint violations on ip and ensures
    the DB schema expectations (NULL for missing values) are met.
    """
    nullable_fields = ("ip", "target_id", "interlock", "ha_device_class", "extra", "mode")
    for field in nullable_fields:
        if field in snake_data and isinstance(snake_data[field], str) and snake_data[field].strip() == "":
            snake_data[field] = None
    return snake_data


class DevicesAPIView(HomeAssistantView):
    """API endpoint for device list and creation."""

    url = "/api/device_manager/devices"
    name = "api:device_manager:devices"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Get all devices, optionally filtered by room_id.

        Query parameters:
            room_id: If provided, return only devices belonging to this room.

        Returns:
            JSON list of devices in camelCase format.
        """
        try:
            repos = get_repos(request)
            room_id = request.query.get("room_id")
            if room_id:
                devices = await repos["device"].find_by_room(int(room_id))
            else:
                devices = await repos["device"].find_all()
            return self.json([to_camel_case_dict(d) for d in devices])
        except Exception as err:
            _LOGGER.error("Failed to get devices: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new device.

        Expects a JSON body with device fields in camelCase.

        Returns:
            The newly created device in camelCase format (HTTP 201).
        """
        try:
            repos = get_repos(request)
            data = await request.json()
            snake_data = _normalize_device_data(to_snake_case_dict(data))

            # Validate required fields
            if not snake_data.get("mac"):
                return self.json({"error": "mac is required"}, status_code=400)
            if not snake_data.get("room_id"):
                return self.json({"error": "room_id is required"}, status_code=400)

            device_id = await repos["device"].create(snake_data)
            device = await repos["device"].find_by_id(device_id)
            return self.json(to_camel_case_dict(device), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create device: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class DeviceAPIView(HomeAssistantView):
    """API endpoint for individual device operations."""

    url = "/api/device_manager/devices/{entity_id}"
    name = "api:device_manager:device"
    requires_auth = True

    async def get(self, request: web.Request, entity_id: str) -> web.Response:
        """Get a specific device by ID.

        Args:
            request: The aiohttp request.
            entity_id: The device ID from the URL path.

        Returns:
            The device in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            device = await repos["device"].find_by_id(int(entity_id))
            if not device:
                return self.json({"error": "Device not found"}, status_code=404)
            return self.json(to_camel_case_dict(device))
        except Exception as err:
            _LOGGER.error("Failed to get device %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request, entity_id: str) -> web.Response:
        """Update a device.

        Args:
            request: The aiohttp request with JSON body.
            entity_id: The device ID from the URL path.

        Returns:
            The updated device in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            device = await repos["device"].find_by_id(int(entity_id))
            if not device:
                return self.json({"error": "Device not found"}, status_code=404)
            data = await request.json()
            snake_data = _normalize_device_data(to_snake_case_dict(data))
            await repos["device"].update(int(entity_id), snake_data)
            updated = await repos["device"].find_by_id(int(entity_id))
            return self.json(to_camel_case_dict(updated))
        except Exception as err:
            _LOGGER.error("Failed to update device %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Delete a device.

        Args:
            request: The aiohttp request.
            entity_id: The device ID from the URL path.

        Returns:
            Confirmation JSON, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            device = await repos["device"].find_by_id(int(entity_id))
            if not device:
                return self.json({"error": "Device not found"}, status_code=404)
            await repos["device"].delete(int(entity_id))
            return self.json({"result": "ok"})
        except Exception as err:
            _LOGGER.error("Failed to delete device %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)
