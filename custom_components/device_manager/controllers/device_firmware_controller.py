"""API controller for DmDeviceFirmware CRUD operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import to_camel_case_dict, to_snake_case_dict, get_repos

_LOGGER = logging.getLogger(__name__)


class DeviceFirmwaresAPIView(HomeAssistantView):
    """API endpoint for device firmware list and creation."""

    url = "/api/device_manager/device-firmwares"
    name = "api:device_manager:device_firmwares"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Get all device firmwares.

        Returns:
            JSON list of all device firmwares in camelCase format.
        """
        try:
            repos = get_repos(request)
            firmwares = await repos["device_firmware"].find_all()
            return self.json([to_camel_case_dict(f) for f in firmwares])
        except Exception as err:
            _LOGGER.error("Failed to get device firmwares: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new device firmware.

        Expects a JSON body with device firmware fields in camelCase.

        Returns:
            The newly created device firmware in camelCase format (HTTP 201).
        """
        try:
            repos = get_repos(request)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            firmware_id = await repos["device_firmware"].create(snake_data)
            firmware = await repos["device_firmware"].find_by_id(firmware_id)
            return self.json(to_camel_case_dict(firmware), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create device firmware: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class DeviceFirmwareAPIView(HomeAssistantView):
    """API endpoint for individual device firmware operations."""

    url = "/api/device_manager/device-firmwares/{entity_id}"
    name = "api:device_manager:device_firmware"
    requires_auth = True

    async def get(self, request: web.Request, entity_id: str) -> web.Response:
        """Get a specific device firmware by ID.

        Args:
            request: The aiohttp request.
            entity_id: The device firmware ID from the URL path.

        Returns:
            The device firmware in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            firmware = await repos["device_firmware"].find_by_id(int(entity_id))
            if not firmware:
                return self.json(
                    {"error": "Device firmware not found"}, status_code=404
                )
            return self.json(to_camel_case_dict(firmware))
        except Exception as err:
            _LOGGER.error(
                "Failed to get device firmware %s: %s", entity_id, err
            )
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request, entity_id: str) -> web.Response:
        """Update a device firmware.

        Args:
            request: The aiohttp request with JSON body.
            entity_id: The device firmware ID from the URL path.

        Returns:
            The updated device firmware in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            firmware = await repos["device_firmware"].find_by_id(int(entity_id))
            if not firmware:
                return self.json(
                    {"error": "Device firmware not found"}, status_code=404
                )
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            await repos["device_firmware"].update(int(entity_id), snake_data)
            updated = await repos["device_firmware"].find_by_id(int(entity_id))
            return self.json(to_camel_case_dict(updated))
        except Exception as err:
            _LOGGER.error(
                "Failed to update device firmware %s: %s", entity_id, err
            )
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Delete a device firmware.

        Args:
            request: The aiohttp request.
            entity_id: The device firmware ID from the URL path.

        Returns:
            Confirmation JSON, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            firmware = await repos["device_firmware"].find_by_id(int(entity_id))
            if not firmware:
                return self.json(
                    {"error": "Device firmware not found"}, status_code=404
                )
            await repos["device_firmware"].delete(int(entity_id))
            return self.json({"result": "ok"})
        except Exception as err:
            _LOGGER.error(
                "Failed to delete device firmware %s: %s", entity_id, err
            )
            return self.json({"error": str(err)}, status_code=500)
