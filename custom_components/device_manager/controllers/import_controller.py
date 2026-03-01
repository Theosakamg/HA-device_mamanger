"""API controller for CSV import."""

import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import get_repos
from ..services.csv_import_service import CSVImportService

_LOGGER = logging.getLogger(__name__)


class CSVImportAPIView(HomeAssistantView):
    """API endpoint for CSV device import."""

    url = "/api/device_manager/import"
    name = "api:device_manager:import"
    requires_auth = True

    async def post(self, request: web.Request) -> web.Response:
        """Import devices from an uploaded CSV file.

        Expects multipart/form-data with a 'file' field containing
        the CSV data.

        Returns:
            JSON with import results (created/updated counts, errors).
        """
        try:
            repos = get_repos(request)
            post = await request.post()
            file_field = post.get("file")

            if not file_field:
                return self.json({"error": "No file provided"}, status_code=400)

            raw = file_field.file.read()
            try:
                text = raw.decode("utf-8")
            except Exception:
                text = raw.decode("latin-1", errors="replace")

            service = CSVImportService(repos)
            result = await service.import_csv(text)

            return self.json(result)
        except Exception as err:
            _LOGGER.error("CSV import failed: %s", err)
            return self.json({"error": str(err)}, status_code=500)
