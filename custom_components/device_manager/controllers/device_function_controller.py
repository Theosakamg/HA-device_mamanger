"""API controller for DmDeviceFunction CRUD operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import to_camel_case_dict, to_snake_case_dict, get_repos

_LOGGER = logging.getLogger(__name__)


class DeviceFunctionsAPIView(HomeAssistantView):
    """API endpoint for device function list and creation."""

    url = "/api/device_manager/device-functions"
    name = "api:device_manager:device_functions"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Get all device functions.

        Returns:
            JSON list of all device functions in camelCase format.
        """
        try:
            repos = get_repos(request)
            functions = await repos["device_function"].find_all()
            return self.json([to_camel_case_dict(f) for f in functions])
        except Exception as err:
            _LOGGER.error("Failed to get device functions: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new device function.

        Expects a JSON body with device function fields in camelCase.

        Returns:
            The newly created device function in camelCase format (HTTP 201).
        """
        try:
            repos = get_repos(request)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            function_id = await repos["device_function"].create(snake_data)
            function = await repos["device_function"].find_by_id(function_id)
            return self.json(to_camel_case_dict(function), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create device function: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class DeviceFunctionAPIView(HomeAssistantView):
    """API endpoint for individual device function operations."""

    url = "/api/device_manager/device-functions/{entity_id}"
    name = "api:device_manager:device_function"
    requires_auth = True

    async def get(self, request: web.Request, entity_id: str) -> web.Response:
        """Get a specific device function by ID.

        Args:
            request: The aiohttp request.
            entity_id: The device function ID from the URL path.

        Returns:
            The device function in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            function = await repos["device_function"].find_by_id(int(entity_id))
            if not function:
                return self.json(
                    {"error": "Device function not found"}, status_code=404
                )
            return self.json(to_camel_case_dict(function))
        except Exception as err:
            _LOGGER.error(
                "Failed to get device function %s: %s", entity_id, err
            )
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request, entity_id: str) -> web.Response:
        """Update a device function.

        Args:
            request: The aiohttp request with JSON body.
            entity_id: The device function ID from the URL path.

        Returns:
            The updated device function in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            function = await repos["device_function"].find_by_id(int(entity_id))
            if not function:
                return self.json(
                    {"error": "Device function not found"}, status_code=404
                )
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            await repos["device_function"].update(int(entity_id), snake_data)
            updated = await repos["device_function"].find_by_id(int(entity_id))
            return self.json(to_camel_case_dict(updated))
        except Exception as err:
            _LOGGER.error(
                "Failed to update device function %s: %s", entity_id, err
            )
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Delete a device function.

        Args:
            request: The aiohttp request.
            entity_id: The device function ID from the URL path.

        Returns:
            Confirmation JSON, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            function = await repos["device_function"].find_by_id(int(entity_id))
            if not function:
                return self.json(
                    {"error": "Device function not found"}, status_code=404
                )
            await repos["device_function"].delete(int(entity_id))
            return self.json({"result": "ok"})
        except Exception as err:
            _LOGGER.error(
                "Failed to delete device function %s: %s", entity_id, err
            )
            return self.json({"error": str(err)}, status_code=500)
