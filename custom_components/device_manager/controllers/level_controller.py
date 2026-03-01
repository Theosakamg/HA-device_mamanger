"""API controller for DmLevel CRUD operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import to_camel_case_dict, to_snake_case_dict, get_repos

_LOGGER = logging.getLogger(__name__)


class LevelsAPIView(HomeAssistantView):
    """API endpoint for level list and creation."""

    url = "/api/device_manager/levels"
    name = "api:device_manager:levels"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Get all levels, optionally filtered by home_id.

        Query parameters:
            home_id: If provided, return only levels belonging to this home.

        Returns:
            JSON list of levels in camelCase format.
        """
        try:
            repos = get_repos(request)
            home_id = request.query.get("home_id")
            if home_id:
                levels = await repos["level"].find_by_home(int(home_id))
            else:
                levels = await repos["level"].find_all()
            return self.json([to_camel_case_dict(l) for l in levels])
        except Exception as err:
            _LOGGER.error("Failed to get levels: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new level.

        Expects a JSON body with level fields in camelCase.

        Returns:
            The newly created level in camelCase format (HTTP 201).
        """
        try:
            repos = get_repos(request)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            level_id = await repos["level"].create(snake_data)
            level = await repos["level"].find_by_id(level_id)
            return self.json(to_camel_case_dict(level), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create level: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class LevelAPIView(HomeAssistantView):
    """API endpoint for individual level operations."""

    url = "/api/device_manager/levels/{entity_id}"
    name = "api:device_manager:level"
    requires_auth = True

    async def get(self, request: web.Request, entity_id: str) -> web.Response:
        """Get a specific level by ID.

        Args:
            request: The aiohttp request.
            entity_id: The level ID from the URL path.

        Returns:
            The level in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            level = await repos["level"].find_by_id(int(entity_id))
            if not level:
                return self.json({"error": "Level not found"}, status_code=404)
            return self.json(to_camel_case_dict(level))
        except Exception as err:
            _LOGGER.error("Failed to get level %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request, entity_id: str) -> web.Response:
        """Update a level.

        Args:
            request: The aiohttp request with JSON body.
            entity_id: The level ID from the URL path.

        Returns:
            The updated level in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            level = await repos["level"].find_by_id(int(entity_id))
            if not level:
                return self.json({"error": "Level not found"}, status_code=404)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            await repos["level"].update(int(entity_id), snake_data)
            updated = await repos["level"].find_by_id(int(entity_id))
            return self.json(to_camel_case_dict(updated))
        except Exception as err:
            _LOGGER.error("Failed to update level %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Delete a level (cascades to rooms, devices).

        Args:
            request: The aiohttp request.
            entity_id: The level ID from the URL path.

        Returns:
            Confirmation JSON, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            level = await repos["level"].find_by_id(int(entity_id))
            if not level:
                return self.json({"error": "Level not found"}, status_code=404)
            await repos["level"].delete(int(entity_id))
            return self.json({"result": "ok"})
        except Exception as err:
            _LOGGER.error("Failed to delete level %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)
