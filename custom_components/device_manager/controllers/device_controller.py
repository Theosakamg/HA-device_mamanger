"""API controller for DmDevice CRUD operations."""

import logging

from aiohttp import web

from .crud import CrudListView, CrudDetailView, _handle_errors
from .base import get_repos
from ..utils.case_convert import to_camel_case_dict, to_snake_case_dict

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


class DevicesAPIView(CrudListView):
    """API endpoint for device list and creation."""

    url = "/api/device_manager/devices"
    name = "api:device_manager:devices"
    repo_key = "device"
    entity_name = "Device"
    filter_param = "room_id"
    filter_method = "find_by_room"
    normalize_data = staticmethod(_normalize_device_data)

    @_handle_errors("Device")
    async def post(self, request: web.Request) -> web.Response:
        """Create a new device with validation.

        Expects a JSON body with device fields in camelCase.

        Returns:
            The newly created device in camelCase format (HTTP 201).
        """
        repos = get_repos(request)
        data = await request.json()
        snake_data = _normalize_device_data(to_snake_case_dict(data))

        # Validate required fields
        required = ("mac", "room_id", "model_id", "firmware_id", "function_id")
        for field in required:
            if not snake_data.get(field):
                return self.json(
                    {"error": f"{field} is required"}, status_code=400
                )

        device_id = await repos[self.repo_key].create(snake_data)
        device = await repos[self.repo_key].find_by_id(device_id)
        return self.json(to_camel_case_dict(device), status_code=201)


class DeviceAPIView(CrudDetailView):
    """API endpoint for individual device operations."""

    url = "/api/device_manager/devices/{entity_id}"
    name = "api:device_manager:device"
    repo_key = "device"
    entity_name = "Device"
    normalize_data = staticmethod(_normalize_device_data)
