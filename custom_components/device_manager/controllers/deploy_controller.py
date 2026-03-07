"""API controller for deployment operations."""

import logging

from .base import BaseView, get_repos, get_db_path
from ..provisioning.deploy import deploy, scan
from ..provisioning.utility import update_runtime_configs

_LOGGER = logging.getLogger(__name__)


class DeployAPIView(BaseView):
    """API endpoint for triggering device deployment."""

    url = "/api/device_manager/deploy"
    name = "api:device_manager:deploy"
    requires_auth = False  # Set to True in production

    async def post(self, request):
        """Trigger device deployment."""
        hass = request.app["hass"]
        settings = await get_repos(request)["settings"].get_all()
        update_runtime_configs(settings)
        db_path = get_db_path(request)
        device_ids = None
        try:
            body = await request.json()
            if isinstance(body, dict):
                raw_ids = body.get("device_ids")
                if isinstance(raw_ids, list) and raw_ids:
                    device_ids = [int(i) for i in raw_ids if isinstance(i, int)]
        except Exception:
            pass
        await hass.async_add_executor_job(deploy, db_path, device_ids)
        return self.json({"result": "Deployment triggered"}, status_code=200)


class DevicesScanAPIView(BaseView):
    """API endpoint for triggering device scan."""

    url = "/api/device_manager/scan"
    name = "api:device_manager:scan"
    requires_auth = False  # Set to True in production

    async def post(self, request):
        """Trigger device scan."""
        hass = request.app["hass"]
        settings = await get_repos(request)["settings"].get_all()
        update_runtime_configs(settings)
        db_path = get_db_path(request)
        await hass.async_add_executor_job(scan, db_path)
        return self.json({"result": "Scan triggered"}, status_code=200)
