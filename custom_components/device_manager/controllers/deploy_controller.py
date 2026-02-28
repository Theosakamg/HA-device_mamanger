"""API controller for deployment operations."""

import logging

from homeassistant.components.http import HomeAssistantView

from ..provisioning.deploy import deploy

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
