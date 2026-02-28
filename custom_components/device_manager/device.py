from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any


@dataclass
class Device:
    # persisted fields
    mac: Optional[str] = None
    state: Optional[str] = None
    level: Optional[int] = 0
    room_fr: Optional[str] = None
    position_fr: Optional[str] = None
    function: Optional[str] = None
    room_slug: Optional[str] = None
    position_slug: Optional[str] = None
    firmware: Optional[str] = None
    model: Optional[str] = None
    ip: Optional[str] = None
    interlock: Optional[str] = None
    mode: Optional[str] = None
    target: Optional[str] = None
    ha_device_class: Optional[str] = None
    extra: Optional[Any] = None

    # computed fields are not persisted
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


_ALLOWED_FUNCTIONS = {
    'button', 'door', 'doorbell', 'heater', 'light', 'motion', 'shutter', 'tv',
    'window', 'thermal', 'ir', 'presence', 'energy', 'infra', 'water', 'gaz', 'sensor'
}

_ALLOWED_FIRMWARES = {
    'embeded', 'tasmota', 'tuya', 'zigbee', 'na', 'android', 'android-cast', 'wled'
}

_STATE_MAP = {
    'enable': 'Enable',
    'enable-hot': 'Enable-Hot',
    'disable': 'Disable',
    'na': 'NA',
    'ko': 'KO',
}


def _sanitize_slug(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip().lower()
    if not s:
        return None
    # replace spaces with dash and remove unsafe chars
    import re

    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^a-z0-9\-_.]", "", s)
    return s


def normalize_function(fn: Optional[str]) -> Optional[str]:
    if fn is None:
        return None
    s = str(fn).strip().lower()
    if s in _ALLOWED_FUNCTIONS:
        return s
    return _sanitize_slug(s)


def normalize_firmware(fw: Optional[str]) -> Optional[str]:
    if fw is None:
        return None
    s = str(fw).strip().lower()
    if s in _ALLOWED_FIRMWARES:
        return s
    # common variant embedded -> embeded
    s2 = s.replace('embedded', 'embeded')
    if s2 in _ALLOWED_FIRMWARES:
        return s2
    return _sanitize_slug(s)


def normalize_state(state: Optional[str]) -> Dict[str, Any]:
    if state is None:
        return {'state': None, 'enabled': False}
    raw = str(state).strip()
    key = raw.lower().replace(' ', '-').replace('_', '-')
    mapped = _STATE_MAP.get(key)
    if mapped:
        return {'state': mapped, 'enabled': mapped.startswith('Enable')}
    if raw.lower().startswith('enable'):
        return {'state': 'Enable', 'enabled': True}
    return {'state': raw or None, 'enabled': False}


def _build_http_from_ip(ip: Optional[str]) -> Optional[str]:
    if ip is None:
        return None
    s = str(ip).strip()
    if s.startswith('http://') or s.startswith('https://'):
        return s
    # numeric last octet
    if s.isdigit():
        n = int(s)
        if 0 <= n <= 255:
            return f"http://192.168.0.{n}"
    # dotted ipv4
    parts = s.split('.')
    if len(parts) == 4 and all(p.isdigit() for p in parts):
        return f"http://{s}"
    return None


def compute_derived_fields(device: Device) -> Dict[str, Any]:
    level = int(device.level or 0)
    level_prefix = f"l{level}"

    room = _sanitize_slug(device.room_slug or device.room_fr)
    pos = _sanitize_slug(device.position_slug or device.position_fr)
    func = normalize_function(device.function)

    hostname_parts = []
    if level_prefix:
        hostname_parts.append(level_prefix)
    if room:
        hostname_parts.append(room)
    if func:
        hostname_parts.append(func)
    if pos:
        hostname_parts.append(pos)

    hostname = "_".join(hostname_parts) if hostname_parts else None

    mqtt_topic = f"home/{level_prefix}/{room}/{func}/{pos}" if room and func and pos else None

    dns = f"{hostname}.domo.in-res.net" if hostname else None
    link = _build_http_from_ip(device.ip)
    count_topic = len(hostname) if hostname else None

    enabled = normalize_state(device.state)['enabled']

    return {
        'hostname': hostname,
        'mqtt_topic': mqtt_topic,
        'dns': dns,
        'link': link,
        'count_topic': count_topic,
        'enabled': enabled,
    }
