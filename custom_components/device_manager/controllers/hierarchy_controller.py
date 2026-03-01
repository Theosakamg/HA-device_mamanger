"""API controller for hierarchy tree operations."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import get_repos

_LOGGER = logging.getLogger(__name__)


class HierarchyAPIView(HomeAssistantView):
    """API endpoint for the full hierarchy tree."""

    url = "/api/device_manager/hierarchy"
    name = "api:device_manager:hierarchy"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Build and return the full hierarchy tree.

        Returns:
            JSON with structure:
            {
                "homes": [
                    {
                        "type": "home", "id": 1, "name": "...", "slug": "...",
                        "deviceCount": N,
                        "children": [
                            {
                                "type": "level", "id": 1, "name": "...",
                                "slug": "...", "deviceCount": N,
                                "children": [
                                    {
                                        "type": "room", "id": 1, "name": "...",
                                        "slug": "...", "deviceCount": N,
                                        "children": []
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "totalDevices": N
            }
        """
        try:
            repos = get_repos(request)
            homes = await repos["home"].find_all()
            total_devices = 0
            home_nodes = []

            for home in homes:
                home_device_count = 0
                levels = await repos["level"].find_by_home(home["id"])
                level_nodes = []

                for level in levels:
                    level_device_count = 0
                    rooms = await repos["room"].find_by_level(level["id"])
                    room_nodes = []

                    for room in rooms:
                        device_count = await repos["device"].count_by_room(
                            room["id"]
                        )
                        level_device_count += device_count
                        room_nodes.append({
                            "type": "room",
                            "id": room["id"],
                            "name": room["name"],
                            "slug": room["slug"],
                            "description": room.get("description", ""),
                            "image": room.get("image", ""),
                            "createdAt": room.get("created_at", ""),
                            "updatedAt": room.get("updated_at", ""),
                            "deviceCount": device_count,
                            "children": [],
                        })

                    home_device_count += level_device_count
                    level_nodes.append({
                        "type": "level",
                        "id": level["id"],
                        "name": level["name"],
                        "slug": level["slug"],
                        "description": level.get("description", ""),
                        "image": level.get("image", ""),
                        "createdAt": level.get("created_at", ""),
                        "updatedAt": level.get("updated_at", ""),
                        "deviceCount": level_device_count,
                        "children": room_nodes,
                    })

                total_devices += home_device_count
                home_nodes.append({
                    "type": "home",
                    "id": home["id"],
                    "name": home["name"],
                    "slug": home["slug"],
                    "description": home.get("description", ""),
                    "image": home.get("image", ""),
                    "createdAt": home.get("created_at", ""),
                    "updatedAt": home.get("updated_at", ""),
                    "deviceCount": home_device_count,
                    "children": level_nodes,
                })

            return self.json({
                "homes": home_nodes,
                "totalDevices": total_devices,
            })
        except Exception as err:
            _LOGGER.error("Failed to build hierarchy: %s", err)
            return self.json({"error": str(err)}, status_code=500)
