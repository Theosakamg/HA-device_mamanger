"""API controller for data export (CSV / JSON / YAML)."""

import csv
import io
import json
import logging
from typing import Any

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from .base import get_repos

_LOGGER = logging.getLogger(__name__)

# Column order for CSV export — matches the original import CSV layout.
CSV_COLUMNS = [
    "MAC",
    "IP",
    "Enabled",
    "Level",
    "Room",
    "Position Name",
    "Position Slug",
    "Function",
    "Firmware",
    "Model",
    "Mode",
    "Interlock",
    "HA Device Class",
    "Extra",
]


def _device_to_row(device: dict[str, Any]) -> dict[str, str]:
    """Convert a joined device dict into a flat export row."""
    return {
        "MAC": device.get("mac", ""),
        "IP": device.get("ip", "") or "",
        "Enabled": "true" if device.get("enabled") else "false",
        "Level": device.get("level_name", "") or "",
        "Room": device.get("room_name", "") or "",
        "Position Name": device.get("position_name", ""),
        "Position Slug": device.get("position_slug", ""),
        "Function": device.get("function_name", "") or "",
        "Firmware": device.get("firmware_name", "") or "",
        "Model": device.get("model_name", "") or "",
        "Mode": device.get("mode", ""),
        "Interlock": device.get("interlock", ""),
        "HA Device Class": device.get("ha_device_class", ""),
        "Extra": device.get("extra", ""),
    }


def _build_csv(devices: list[dict[str, Any]]) -> str:
    """Build a CSV string from device records."""
    output = io.StringIO()
    writer = csv.DictWriter(
        output, fieldnames=CSV_COLUMNS, extrasaction="ignore"
    )
    writer.writeheader()
    for device in devices:
        writer.writerow(_device_to_row(device))
    return output.getvalue()


def _build_json(devices: list[dict[str, Any]]) -> str:
    """Build a pretty JSON string from device records."""
    rows = [_device_to_row(d) for d in devices]
    return json.dumps(rows, indent=2, ensure_ascii=False)


def _build_yaml(devices: list[dict[str, Any]]) -> str:
    """Build a YAML string from device records (no PyYAML dependency)."""
    lines: list[str] = []
    for device in devices:
        row = _device_to_row(device)
        lines.append("- MAC: \"%s\"" % row["MAC"])
        for col in CSV_COLUMNS[1:]:
            val = row[col]
            # Quote strings that could be misinterpreted
            if val == "":
                lines.append("  %s: \"\"" % col.replace(" ", "_"))
            elif val in ("true", "false"):
                lines.append("  %s: %s" % (col.replace(" ", "_"), val))
            else:
                escaped = val.replace('"', '\\"')
                lines.append("  %s: \"%s\"" % (col.replace(" ", "_"), escaped))
    return "\n".join(lines) + "\n"


class ExportAPIView(HomeAssistantView):
    """API endpoint to export all devices in CSV, JSON, or YAML format.

    Format selection priority:
    1. ``?format=csv|json|yaml`` query parameter
    2. ``Accept`` header (text/csv, application/json, text/yaml)
    3. Default: CSV
    """

    url = "/api/device_manager/export"
    name = "api:device_manager:export"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        """Export all devices.

        Returns:
            The device data as a downloadable file.
        """
        try:
            repos = get_repos(request)
            devices = await repos["device"].find_all()

            fmt = self._resolve_format(request)

            if fmt == "json":
                body = _build_json(devices)
                content_type = "application/json"
                filename = "devices.json"
            elif fmt == "yaml":
                body = _build_yaml(devices)
                content_type = "text/yaml"
                filename = "devices.yaml"
            else:
                body = _build_csv(devices)
                content_type = "text/csv"
                filename = "devices.csv"

            return web.Response(
                text=body,
                content_type=content_type,
                headers={
                    "Content-Disposition": (
                        f'attachment; filename="{filename}"'
                    ),
                },
            )
        except Exception as err:
            _LOGGER.error("Export failed: %s", err)
            return web.json_response(
                {"error": str(err)}, status=500
            )

    @staticmethod
    def _resolve_format(request: web.Request) -> str:
        """Determine the export format from query param or Accept header."""
        # Query param takes priority
        fmt = request.query.get("format", "").lower()
        if fmt in ("csv", "json", "yaml"):
            return fmt

        # Fall back to Accept header
        accept = request.headers.get("Accept", "")
        if "application/json" in accept:
            return "json"
        if "text/yaml" in accept or "application/yaml" in accept:
            return "yaml"

        return "csv"
