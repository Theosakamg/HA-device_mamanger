"""Constants for Device Manager integration."""

DOMAIN = "device_manager"
DB_NAME = "device_manager.db"

# Table names
TABLE_HOMES = "dm_homes"
TABLE_LEVELS = "dm_levels"
TABLE_ROOMS = "dm_rooms"
TABLE_DEVICES = "dm_devices"
TABLE_DEVICE_MODELS = "dm_device_models"
TABLE_DEVICE_FIRMWARES = "dm_device_firmwares"
TABLE_DEVICE_FUNCTIONS = "dm_device_functions"

# Allowed function values
ALLOWED_FUNCTIONS = {
    "button", "door", "doorbell", "heater", "light", "motion",
    "shutter", "tv", "window", "thermal", "ir", "presence",
    "energy", "infra", "water", "gaz", "sensor",
}

# Allowed firmware values
ALLOWED_FIRMWARES = {
    "embeded", "tasmota", "tuya", "zigbee", "na",
    "android", "android-cast", "wled",
}

# State mapping
STATE_MAP = {
    "enable": "Enable",
    "enable-hot": "Enable-Hot",
    "disable": "Disable",
    "na": "NA",
    "ko": "KO",
}

# DNS suffix for FQDN
DNS_SUFFIX = "domo.in-res.net"

# Default IP prefix for short numeric IPs
DEFAULT_IP_PREFIX = "192.168.0"
