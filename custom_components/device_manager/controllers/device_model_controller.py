"""API controller for DmDeviceModel CRUD operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import to_camel_case_dict, to_snake_case_dict, get_repos

_LOGGER = logging.getLogger(__name__)


class DeviceModelsAPIView(HomeAssistantView):
    """API endpoint for device model list and creation."""

    url = "/api/device_manager/device-models"
    name = "api:device_manager:device_models"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Get all device models.

        Returns:
            JSON list of all device models in camelCase format.
        """
        try:
            repos = get_repos(request)
            models = await repos["device_model"].find_all()
            return self.json([to_camel_case_dict(m) for m in models])
        except Exception as err:
            _LOGGER.error("Failed to get device models: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new device model.

        Expects a JSON body with device model fields in camelCase.

        Returns:
            The newly created device model in camelCase format (HTTP 201).
        """
        try:
            repos = get_repos(request)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            model_id = await repos["device_model"].create(snake_data)
            model = await repos["device_model"].find_by_id(model_id)
            return self.json(to_camel_case_dict(model), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create device model: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class DeviceModelAPIView(HomeAssistantView):
    """API endpoint for individual device model operations."""

    url = "/api/device_manager/device-models/{entity_id}"
    name = "api:device_manager:device_model"
    requires_auth = True

    async def get(self, request: web.Request, entity_id: str) -> web.Response:
        """Get a specific device model by ID.

        Args:
            request: The aiohttp request.
            entity_id: The device model ID from the URL path.

        Returns:
            The device model in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            model = await repos["device_model"].find_by_id(int(entity_id))
            if not model:
                return self.json(
                    {"error": "Device model not found"}, status_code=404
                )
            return self.json(to_camel_case_dict(model))
        except Exception as err:
            _LOGGER.error("Failed to get device model %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request, entity_id: str) -> web.Response:
        """Update a device model.

        Args:
            request: The aiohttp request with JSON body.
            entity_id: The device model ID from the URL path.

        Returns:
            The updated device model in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            model = await repos["device_model"].find_by_id(int(entity_id))
            if not model:
                return self.json(
                    {"error": "Device model not found"}, status_code=404
                )
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            await repos["device_model"].update(int(entity_id), snake_data)
            updated = await repos["device_model"].find_by_id(int(entity_id))
            return self.json(to_camel_case_dict(updated))
        except Exception as err:
            _LOGGER.error("Failed to update device model %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Delete a device model.

        Args:
            request: The aiohttp request.
            entity_id: The device model ID from the URL path.

        Returns:
            Confirmation JSON, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            model = await repos["device_model"].find_by_id(int(entity_id))
            if not model:
                return self.json(
                    {"error": "Device model not found"}, status_code=404
                )
            await repos["device_model"].delete(int(entity_id))
            return self.json({"result": "ok"})
        except Exception as err:
            _LOGGER.error("Failed to delete device model %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)
