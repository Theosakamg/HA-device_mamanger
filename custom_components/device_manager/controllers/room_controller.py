"""API controller for DmRoom CRUD operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import to_camel_case_dict, to_snake_case_dict, get_repos

_LOGGER = logging.getLogger(__name__)


class RoomsAPIView(HomeAssistantView):
    """API endpoint for room list and creation."""

    url = "/api/device_manager/rooms"
    name = "api:device_manager:rooms"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Get all rooms, optionally filtered by level_id.

        Query parameters:
            level_id: If provided, return only rooms belonging to this level.

        Returns:
            JSON list of rooms in camelCase format.
        """
        try:
            repos = get_repos(request)
            level_id = request.query.get("level_id")
            if level_id:
                rooms = await repos["room"].find_by_level(int(level_id))
            else:
                rooms = await repos["room"].find_all()
            return self.json([to_camel_case_dict(r) for r in rooms])
        except Exception as err:
            _LOGGER.error("Failed to get rooms: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new room.

        Expects a JSON body with room fields in camelCase.

        Returns:
            The newly created room in camelCase format (HTTP 201).
        """
        try:
            repos = get_repos(request)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            room_id = await repos["room"].create(snake_data)
            room = await repos["room"].find_by_id(room_id)
            return self.json(to_camel_case_dict(room), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create room: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class RoomAPIView(HomeAssistantView):
    """API endpoint for individual room operations."""

    url = "/api/device_manager/rooms/{entity_id}"
    name = "api:device_manager:room"
    requires_auth = True

    async def get(self, request: web.Request, entity_id: str) -> web.Response:
        """Get a specific room by ID.

        Args:
            request: The aiohttp request.
            entity_id: The room ID from the URL path.

        Returns:
            The room in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            room = await repos["room"].find_by_id(int(entity_id))
            if not room:
                return self.json({"error": "Room not found"}, status_code=404)
            return self.json(to_camel_case_dict(room))
        except Exception as err:
            _LOGGER.error("Failed to get room %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request, entity_id: str) -> web.Response:
        """Update a room.

        Args:
            request: The aiohttp request with JSON body.
            entity_id: The room ID from the URL path.

        Returns:
            The updated room in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            room = await repos["room"].find_by_id(int(entity_id))
            if not room:
                return self.json({"error": "Room not found"}, status_code=404)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            await repos["room"].update(int(entity_id), snake_data)
            updated = await repos["room"].find_by_id(int(entity_id))
            return self.json(to_camel_case_dict(updated))
        except Exception as err:
            _LOGGER.error("Failed to update room %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Delete a room (cascades to devices).

        Args:
            request: The aiohttp request.
            entity_id: The room ID from the URL path.

        Returns:
            Confirmation JSON, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            room = await repos["room"].find_by_id(int(entity_id))
            if not room:
                return self.json({"error": "Room not found"}, status_code=404)
            await repos["room"].delete(int(entity_id))
            return self.json({"result": "ok"})
        except Exception as err:
            _LOGGER.error("Failed to delete room %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)
