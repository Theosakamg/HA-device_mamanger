"""Static content controller for Device Manager frontend."""

import logging
from pathlib import Path

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

_LOGGER = logging.getLogger(__name__)


class MainView(HomeAssistantView):
    """Serve the main frontend HTML page."""

    url = "/device_manager"
    name = "api:device_manager:main"
    requires_auth = False

    async def get(self, request: web.Request) -> web.Response:
        """Serve the main HTML page with the web component."""
        html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Device Manager</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont,
            "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: #f5f5f5; }
    </style>
</head>
<body>
    <dm-app-shell></dm-app-shell>
    <script type="module" src="/device_manager_static/device-manager.js"></script>
</body>
</html>"""
        return web.Response(text=html_content, content_type="text/html")


class StaticView(HomeAssistantView):
    """Serve static frontend files from the dist directory."""

    url = "/device_manager_static/{filename}"
    name = "api:device_manager:static"
    requires_auth = False

    async def get(self, request: web.Request, filename: str) -> web.Response:
        """Serve a static file by name.

        Args:
            request: The aiohttp request.
            filename: Name of the static file to serve.

        Returns:
            The file content with appropriate content type.
        """
        try:
            component_path = Path(__file__).parent.parent
            static_path = component_path / "frontend" / "dist" / filename

            if not static_path.exists():
                _LOGGER.error("Static file not found: %s", static_path)
                return web.Response(status=404, text="File not found")

            hass = request.app["hass"]
            content = await hass.async_add_executor_job(
                lambda: static_path.read_bytes()
            )

            content_type = "application/javascript"
            if filename.endswith(".css"):
                content_type = "text/css"
            elif filename.endswith(".html"):
                content_type = "text/html"

            return web.Response(body=content, content_type=content_type)
        except Exception as err:
            _LOGGER.error("Failed to serve static file %s: %s", filename, err)
            return web.Response(status=500, text="Internal server error")
