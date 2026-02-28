"""API views for HA Device Manager."""

import logging
from pathlib import Path

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

import aiosqlite

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

            # Read file in executor to avoid blocking the event loop
            hass = request.app["hass"]
            content = await hass.async_add_executor_job(lambda: static_path.read_bytes())

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

            # Convert snake_case DB columns to camelCase for frontend convenience
            def _to_camel_case_dict(d: dict):
                out = {}
                for k, v in d.items():
                    parts = k.split("_")
                    if len(parts) == 1:
                        out[k] = v
                    else:
                        camel = parts[0] + ''.join(p.capitalize() for p in parts[1:])
                        out[camel] = v
                return out

            camel_devices = [_to_camel_case_dict(d) for d in devices]
            return self.json(camel_devices)
        except Exception as err:
            _LOGGER.error("Failed to get devices: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    async def post(self, request):
        """Create a new device via JSON POST."""
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]
            data = await request.json()

            # Optional validation
            name = data.get("name")
            if name is not None and isinstance(name, str) and not name.strip():
                return self.json({"error": "If provided, device name must not be empty"}, status_code=400)

            # Create device with provided persisted fields
            device_id = await db.create_device(data)
            device = await db.get_device(device_id)

            # Return camelCase keys for created device
            def _to_camel_case_dict(d: dict):
                out = {}
                for k, v in d.items():
                    parts = k.split("_")
                    if len(parts) == 1:
                        out[k] = v
                    else:
                        camel = parts[0] + ''.join(p.capitalize() for p in parts[1:])
                        out[camel] = v
                return out

            return self.json(_to_camel_case_dict(device), status_code=201)
        except Exception as err:
            _LOGGER.error("Failed to create device: %s", err)
            return self.json({"error": str(err)}, status_code=500)


class CSVImportAPIView(HomeAssistantView):
    """API endpoint to import devices from a CSV file."""

    url = "/api/device_manager/import"
    name = "api:device_manager:import"
    requires_auth = False  # Set to True in production

    async def post(self, request):
        """Import devices from uploaded CSV file (multipart/form-data).

        Returns a JSON object with an array of log entries for each processed row.
        """
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]

            post = await request.post()
            file_field = post.get("file")
            if not file_field:
                return self.json({"error": "No file provided"}, status_code=400)

            raw = file_field.file.read()
            try:
                text = raw.decode("utf-8")
            except Exception:
                text = raw.decode("latin-1", errors="replace")

            import csv
            import io

            reader = csv.DictReader(io.StringIO(text))
            logs = []
            created = 0

            # common header mapping from CSV to DB columns
            header_map = {
                "Check": None,
                "MAC": "mac",
                "State": "state",
                "Level": "level",
                "Room FR": "room_fr",
                "Position FR": "position_fr",
                "Function": "function",
                "Room SLUG": "room_slug",
                "Position SLUG": "position_slug",
                "Firmware": "firmware",
                "Model": "model",
                "IP": "ip",
                "Interlock": "interlock",
                "Mode": "mode",
                "Target": "target",
                "HA_device_class": "ha_device_class",
                "Extra": "extra",
                "Link": "link",
                "MQTT": "mqtt",
                "Hostname": "hostname",
                "DNS": "dns",
                "count_topic": "count_topic",
                "Notes": "notes",
                "Bat": "bat",
            }

            # Determine existing columns in the devices table so we only send
            # supported fields to the database (avoids 'no column named' errors).
            async with aiosqlite.connect(db.db_path) as conn:
                cursor = await conn.execute("PRAGMA table_info(devices)")
                rows = await cursor.fetchall()
                existing_cols = {r[1] for r in rows}

            for i, row in enumerate(reader, start=1):
                # build device dict only with known DB columns
                device = {}
                for csv_key, db_key in header_map.items():
                    if db_key and csv_key in row and db_key in existing_cols:
                        val = row[csv_key].strip() if row[csv_key] is not None else None
                        device[db_key] = val if val != "" else None
                # If name is missing, generate it from CSV fields following the
                # hierarchical rule: Home > Lv{level} > {Room} > {Function} > {Model/Target}

                def _titleize(val):
                    if not val:
                        return None
                    try:
                        v = str(val).strip()
                    except Exception:
                        return None
                    if not v:
                        return None
                    v = v.replace("_", " ").replace("-", " ")
                    return " ".join(p.capitalize() for p in v.split())

                if not device.get("name"):
                    level_raw = device.get("level") or (row.get("Level") or "")
                    level_raw = str(level_raw).strip()
                    lv = f"Lv{level_raw}" if level_raw else "Lv0"

                    room_raw = (
                        device.get("room_slug")
                        or row.get("Room SLUG")
                        or row.get("Room FR")
                        or row.get("Room")
                        or ""
                    )
                    room = _titleize(room_raw)

                    func = _titleize(device.get("function") or row.get("Function") or "")

                    # Use Position SLUG as the suffix per requested rule; fallback to mac or generated id
                    pos_raw = (
                        device.get("position_slug")
                        or row.get("Position SLUG")
                        or row.get("Position FR")
                        or row.get("Position")
                        or ""
                    )
                    suffix = _titleize(pos_raw) or _titleize(device.get("mac")) or f"device-{i}"

                    parts = ["Home", lv]
                    if room:
                        parts.append(room)
                    if func:
                        parts.append(func)
                    if suffix:
                        parts.append(suffix)

                    try:
                        device["name"] = " > ".join(parts)
                        _LOGGER.debug("Generated device name for row %s: %s", i, device["name"])
                    except Exception:
                        device["name"] = f"Home > Lv0 > Unknown > device-{i}"
                        _LOGGER.debug("Fallback device name for row %s: %s", i, device["name"])

                try:
                    device_id = await db.create_device(device)
                    created += 1
                    logs.append({"line": i, "status": "created", "id": device_id, "mac": device.get("mac")})
                except Exception as e:
                    # Log full traceback and include the sanitized device payload so we can
                    # identify which field/value triggers the failure during create.
                    _LOGGER.exception("Failed to import row %s; device=%s", i, device)
                    logs.append({"line": i, "status": "error", "error": str(e), "row": device})

            return self.json({"created": created, "logs": logs})
        except Exception as err:
            _LOGGER.error("CSV import failed: %s", err)
            return self.json({"error": str(err)}, status_code=500)

    # NOTE: device creation via POST /api/device_manager/devices is handled
    # by `DevicesAPIView.post` above. The CSV import handler remains focused
    # on processing the uploaded CSV and reporting per-line results.


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
            # Convert keys to camelCase for frontend
            out = {}
            for k, v in device.items():
                parts = k.split("_")
                if len(parts) == 1:
                    out[k] = v
                else:
                    camel = parts[0] + ''.join(p.capitalize() for p in parts[1:])
                    out[camel] = v

            return self.json(out)
        except Exception as err:
            _LOGGER.error("Failed to get device %s: %s", device_id, err)
            return self.json({"error": str(err)}, status_code=500)

    async def put(self, request, device_id):
        """Update a device."""
        try:
            hass = request.app["hass"]
            db = hass.data[DOMAIN]["db"]
            data = await request.json()

            # Optional validation: if name provided, ensure not empty
            if "name" in data and isinstance(data["name"], str) and not data["name"].strip():
                return self.json({"error": "If provided, device name must not be empty"}, status_code=400)

            # Check if device exists
            device = await db.get_device(int(device_id))
            if not device:
                return self.json({"error": "Device not found"}, status_code=404)

            # Update device with provided persisted fields
            await db.update_device(int(device_id), data)
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
