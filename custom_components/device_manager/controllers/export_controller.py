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

# Column order for CSV export — mirrors the original import CSV layout
# (see samples/Electrique - Domotique.csv and HEADER_MAP in
# csv_import_service.py).  Computed/read-only columns that the importer
# ignores (Link, MQTT, Hostname …) are intentionally omitted.
CSV_COLUMNS = [
    "Check",
    "MAC",
    "State",
    "Level",
    "Room FR",
    "Position FR",
    "Function",
    "Room SLUG",
    "Position SLUG",
    "Firmware",
    "Model",
    "IP",
    "Interlock",
    "Mode",
    "Target",
    "HA_device_class",
    "Extra",
]


def _device_to_row(device: dict[str, Any]) -> dict[str, str]:
    """Convert a joined device dict into a flat export row.

    The returned keys must match :data:`CSV_COLUMNS` exactly so that an
    exported CSV can be re-imported by :class:`CSVImportService`.
    """
    # Extract the numeric level value from the slug
    # (e.g. "l0" → "0")
    level_slug = device.get("level_slug", "") or ""
    if level_slug.startswith("l"):
        level_num = level_slug.lstrip("l")
    else:
        level_num = level_slug

    # Map enabled boolean back to the State vocabulary used in the CSV
    enabled = device.get("enabled")
    state = "Enable" if enabled else "Disable"

    return {
        "Check": "",
        "MAC": device.get("mac", ""),
        "State": state,
        "Level": level_num,
        "Room FR": device.get("room_name", "") or "",
        "Position FR": device.get("position_name", ""),
        "Function": device.get("function_name", "") or "",
        "Room SLUG": device.get("room_slug", "") or "",
        "Position SLUG": device.get("position_slug", ""),
        "Firmware": device.get("firmware_name", "") or "",
        "Model": device.get("model_name", "") or "",
        "IP": device.get("ip", "") or "",
        "Interlock": device.get("interlock", ""),
        "Mode": device.get("mode", ""),
        "Target": device.get("target_mac", "") or "",
        "HA_device_class": device.get("ha_device_class", ""),
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
