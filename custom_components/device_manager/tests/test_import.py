import csv
import io
import asyncio
from pathlib import Path
import tempfile

# Local imports (load by path so tests can run without Home Assistant)
from custom_components.device_manager.database import DatabaseManager


SAMPLE_CSV = Path(__file__).resolve().parents[2] / "samples" / "Electrique - Domotique.csv"

# Fallback CSV content used when the sample file is not available inside the container
FALLBACK_CSV = """MAC,State,Level,Room FR,Position FR,Function,Room SLUG,Position SLUG,Firmware,Model,IP
7C:2C:67:D7:DF:E8,Enable,0,Bureau,,Button,office,lunch,Tasmota,Athom Mini Relay V2,192.168.0.77
24:EC:4A:B0:CE:BC,Enable,0,Bureau,,Energy,office,desk,Tasmota,Athom Plug V3,192.168.0.189
"""


def test_csv_import_to_db():
    async def coro():
        with tempfile.TemporaryDirectory() as td:
            db_path = Path(td) / "test_device_manager.db"
            db = DatabaseManager(db_path)
            await db.initialize()

            if SAMPLE_CSV.exists():
                text = SAMPLE_CSV.read_text(encoding='utf8', errors='replace')
            else:
                text = FALLBACK_CSV
            reader = csv.DictReader(io.StringIO(text))

            header_map = {
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
            }

            created = 0
            for row in reader:
                device = {}
                for csv_key, db_key in header_map.items():
                    if db_key and csv_key in row:
                        val = row[csv_key].strip() if row[csv_key] is not None else None
                        device[db_key] = val if val != "" else None
                # create device
                await db.create_device(device)
                created += 1

            devices = await db.get_devices()
            assert len(devices) == created

    asyncio.run(coro())
