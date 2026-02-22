"""API views for HA Device Manager."""

import logging
from pathlib import Path

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class MainView(HomeAssistantView):
    """Serve the main frontend interface."""

    url = "/device_manager"
    name = "api:device_manager:main"
    requires_auth = False  # Public access for the interface

    async def get(self, request):
        """Serve the main HTML page."""
        html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Device Manager</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f5f5f5;
        }
    </style>
</head>
<body>
    <device-manager-app></device-manager-app>
    <script type="module"
        src="/device_manager_static/device-manager.js">
    </script>
</body>
</html>
        """
        return web.Response(text=html_content, content_type="text/html")


class StaticView(HomeAssistantView):
    """Serve static frontend files."""

    url = "/device_manager_static/{filename}"
    name = "api:device_manager:static"
    requires_auth = False

    async def get(self, request, filename):
        """Serve static files."""
        try:
            component_path = Path(__file__).parent
            static_path = component_path / "frontend" / "dist" / filename

            if not static_path.exists():
                _LOGGER.error("Static file not found: %s", static_path)
                return web.Response(status=404, text="File not found")

            with open(static_path, "rb") as f:
                content = f.read()

            # Determine content type
            content_type = "application/javascript"
            if filename.endswith(".css"):
                content_type = "text/css"
            elif filename.endswith(".html"):
                content_type = "text/html"

            return web.Response(body=content, content_type=content_type)
        except Exception as err:
            _LOGGER.error("Failed to serve static file %s: %s", filename, err)
            return web.Response(status=500, text="Internal server error")


class DevicesAPIView(HomeAssistantView):
    """API endpoint for devices list operations."""

    url = "/api/device_manager/devices"
    name = "api:device_manager:devices"
    requires_auth = False  # Set to True in production

    async def get(self, request):
        """Get all devices."""
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]
            devices = await db.get_devices()
            return self.json(devices)
        except Exception as err:
            _LOGGER.error("Failed to get devices: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request):
        """Create a new device."""
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]
            data = await request.json()

            # Validate input
            name = data.get("name", "").strip()
            if not name:
                return self.json({"error": "Device name is required"}, status_code=400)

            # Create device
            device_id = await db.create_device(name)
            device = await db.get_device(device_id)

            return self.json(device, status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create device: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class DeviceAPIView(HomeAssistantView):
    """API endpoint for individual device operations."""

    url = "/api/device_manager/devices/{device_id}"
    name = "api:device_manager:device"
    requires_auth = False  # Set to True in production

    async def get(self, request, device_id):
        """Get a specific device."""
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]
            device = await db.get_device(int(device_id))

            if not device:
                return self.json({"error": "Device not found"}, status_code=404)

            return self.json(device)
        except Exception as err:
            _LOGGER.error("Failed to get device %s: %s", device_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request, device_id):
        """Update a device."""
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]
            data = await request.json()

            # Validate input
            name = data.get("name", "").strip()
            if not name:
                return self.json({"error": "Device name is required"}, status_code=400)

            # Check if device exists
            device = await db.get_device(int(device_id))
            if not device:
                return self.json({"error": "Device not found"}, status_code=404)

            # Update device
            await db.update_device(int(device_id), name)
            updated_device = await db.get_device(int(device_id))

            return self.json(updated_device)
        except Exception as err:
            _LOGGER.error("Failed to update device %s: %s", device_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def delete(self, request, device_id):
        """Delete a device."""
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]

            # Check if device exists
            device = await db.get_device(int(device_id))
            if not device:
                return self.json({"error": "Device not found"}, status_code=404)

            # Delete device
            await db.delete_device(int(device_id))

            return self.json({"result": "ok"}, status_code=200)
        except Exception as err:
            _LOGGER.error("Failed to delete device %s: %s", device_id, err)
            return self.json({"error": str(err)}, status_code=500)
