"""API controller for deployment operations."""

import logging

from homeassistant.components.http import HomeAssistantView

from ..provisioning.deploy import deploy, scan

_LOGGER = logging.getLogger(__name__)


class DeployAPIView(HomeAssistantView):
    """API endpoint for triggering device deployment."""

    url = "/api/device_manager/deploy"
    name = "api:device_manager:deploy"
    requires_auth = False  # Set to True in production

    async def post(self, request):
        """Trigger device deployment."""
        hass = request.app["hass"]
        await hass.async_add_executor_job(deploy)
        return self.json({"result": "Deployment triggered"}, status_code=200)


class DevicesScanAPIView(HomeAssistantView):
    """API endpoint for triggering device scan."""

    url = "/api/device_manager/scan"
    name = "api:device_manager:scan"
    requires_auth = False  # Set to True in production

    async def post(self, request):
        """Trigger device scan."""
        hass = request.app["hass"]
        await hass.async_add_executor_job(scan)
        return self.json({"result": "Scan triggered"}, status_code=200)
