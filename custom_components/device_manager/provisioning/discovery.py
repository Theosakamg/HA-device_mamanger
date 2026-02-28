import os
import sqlite3
import subprocess
import yaml
import logging
from .utility import get_config

FILE_CACHE = get_config('FILE_CACHE', 'cache_ip.yaml')
FILE_DEVICE = get_config('FILE_DEVICE', 'Electrique - Domotique.csv')
SCAN_SCRIPT = get_config('SCAN_SCRIPT', None)

logger = logging.getLogger(__name__)


class CacheManager:
    __macs_c = {}

    def __init__(self) -> None:
        logger.debug("Init Cache manager...")

    def load_dict(self) -> None:
        logger.info(f"Re/load cache... from cache file {FILE_CACHE}")
        if os.path.isfile(FILE_CACHE):
            with open(FILE_CACHE, 'r') as stream:
                try:
                    self.__macs_c = yaml.safe_load(stream)
                    logger.info(f"Reading {len(self.__macs_c)} mac address.")
                except yaml.YAMLError as e:
                    logger.error(e)

    def make_dict(self) -> None:
        self.load_dict()

        if not SCAN_SCRIPT:
            logger.error("SCAN_SCRIPT is not configured. Cannot perform network scan.")
            return

        logger.info(f"Running scan script: {SCAN_SCRIPT}")
        result = subprocess.run(
            ['bash', SCAN_SCRIPT],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        if result.returncode != 0:
            logger.error(f"Scan script error: {result.stderr.decode('utf-8')}")
            return

        try:
            # Expected output format: "ip: mac" (YAML)
            raw_output = result.stdout.decode('utf-8')
            scan_result = yaml.safe_load(raw_output)
            if not isinstance(scan_result, dict):
                logger.error(f"Unexpected scan script output (expected dict, got {type(scan_result).__name__}): {raw_output!r}")
                return
            self.__macs_c.update({str(mac).lower(): str(ip) for ip, mac in scan_result.items()})
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse scan script output: {e}")
            return

        logger.info("Save on cache...")
        with open(FILE_CACHE, "w") as stream:
            try:
                yaml.dump(self.__macs_c, stream)
            except OSError as e:
                logger.error(e)

        logger.info(f"Reading {len(self.__macs_c)} mac address.")

    def get_macs(self):
        return self.__macs_c


class DevicesManager:
    __devices = {}

    def __init__(self) -> None:
        logger.debug("Init Devices manager...")

    def read(self):
        logger.info(f"Load devices from database: {FILE_DEVICE}...")

        try:
            con = sqlite3.connect(FILE_DEVICE)
            con.row_factory = sqlite3.Row
            cursor = con.cursor()
            cursor.execute("SELECT * FROM devices")
            self.__devices = [dict(row) for row in cursor.fetchall()]
            con.close()
            logger.info(f"Reading {len(self.__devices)} devices.")

        except sqlite3.Error as e:
            logger.error(f"Database error: {e}")

    def get(self):
        return self.__devices


class GlobalManager:
    __cache = None
    __dev_mng = None

    def __init__(self) -> None:
        logger.debug("Init Global manager...")
        self.__cache = CacheManager()
        self.__dev_mng = DevicesManager()
        self.__cache.make_dict()
        self.__dev_mng.read()

    def get_devices(self):
        return self.__dev_mng.get()

    def get_macs(self):
        return self.__cache.get_macs()
