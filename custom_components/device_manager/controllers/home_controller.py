"""API controller for DmHome CRUD operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import to_camel_case_dict, to_snake_case_dict, get_repos

_LOGGER = logging.getLogger(__name__)


class HomesAPIView(HomeAssistantView):
    """API endpoint for home list and creation."""

    url = "/api/device_manager/homes"
    name = "api:device_manager:homes"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Get all homes.

        Returns:
            JSON list of all homes in camelCase format.
        """
        try:
            repos = get_repos(request)
            homes = await repos["home"].find_all()
            return self.json([to_camel_case_dict(h) for h in homes])
        except Exception as err:
            _LOGGER.error("Failed to get homes: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request: web.Request) -> web.Response:
        """Create a new home.

        Expects a JSON body with home fields in camelCase.

        Returns:
            The newly created home in camelCase format (HTTP 201).
        """
        try:
            repos = get_repos(request)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            home_id = await repos["home"].create(snake_data)
            home = await repos["home"].find_by_id(home_id)
            return self.json(to_camel_case_dict(home), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create home: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class HomeAPIView(HomeAssistantView):
    """API endpoint for individual home operations."""

    url = "/api/device_manager/homes/{entity_id}"
    name = "api:device_manager:home"
    requires_auth = True

    async def get(self, request: web.Request, entity_id: str) -> web.Response:
        """Get a specific home by ID.

        Args:
            request: The aiohttp request.
            entity_id: The home ID from the URL path.

        Returns:
            The home in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            home = await repos["home"].find_by_id(int(entity_id))
            if not home:
                return self.json({"error": "Home not found"}, status_code=404)
            return self.json(to_camel_case_dict(home))
        except Exception as err:
            _LOGGER.error("Failed to get home %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request: web.Request, entity_id: str) -> web.Response:
        """Update a home.

        Args:
            request: The aiohttp request with JSON body.
            entity_id: The home ID from the URL path.

        Returns:
            The updated home in camelCase format, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            home = await repos["home"].find_by_id(int(entity_id))
            if not home:
                return self.json({"error": "Home not found"}, status_code=404)
            data = await request.json()
            snake_data = to_snake_case_dict(data)
            await repos["home"].update(int(entity_id), snake_data)
            updated = await repos["home"].find_by_id(int(entity_id))
            return self.json(to_camel_case_dict(updated))
        except Exception as err:
            _LOGGER.error("Failed to update home %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request: web.Request, entity_id: str) -> web.Response:
        """Delete a home (cascades to levels, rooms, devices).

        Args:
            request: The aiohttp request.
            entity_id: The home ID from the URL path.

        Returns:
            Confirmation JSON, or 404 if not found.
        """
        try:
            repos = get_repos(request)
            home = await repos["home"].find_by_id(int(entity_id))
            if not home:
                return self.json({"error": "Home not found"}, status_code=404)
            await repos["home"].delete(int(entity_id))
            return self.json({"result": "ok"})
        except Exception as err:
            _LOGGER.error("Failed to delete home %s: %s", entity_id, err)
            return self.json({"error": str(err)}, status_code=500)
