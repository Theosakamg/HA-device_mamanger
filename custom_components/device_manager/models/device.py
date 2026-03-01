"""DmDevice dataclass model.

Represents a physical device in the device manager.  This is the most complex
model, holding foreign keys to room, model, firmware, function and an optional
self-referencing target device.  Transient fields (prefixed with ``_``) are
populated by repository JOIN queries and are **not** persisted.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import re


def _to_camel_case(snake_str: str) -> str:
    """Convert a snake_case string to camelCase.

    Args:
        snake_str: The snake_case string to convert.

    Returns:
        The camelCase equivalent.
    """
    parts = snake_str.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def _to_snake_case(camel_str: str) -> str:
    """Convert a camelCase string to snake_case.

    Args:
        camel_str: The camelCase string to convert.

    Returns:
        The snake_case equivalent.
    """
    s = re.sub(r"([A-Z])", r"_\1", camel_str).lower()
    return s.lstrip("_")


@dataclass
class DmDevice:
    """Dataclass representing a physical device.

    Attributes:
        id: Primary key (auto-increment). None for new records.
        mac: Unique MAC address of the device.
        ip: Optional unique IP address of the device (NULL allowed).
        enabled: Whether the device is active.
        position_name: Human-readable position name.
        position_slug: URL-friendly position identifier.
        mode: Operating mode of the device.
        interlock: Interlock configuration string.
        ha_device_class: Home Assistant device class identifier.
        extra: JSON string with additional data.
        created_at: Timestamp when the record was created.
        updated_at: Timestamp when the record was last updated.
        room_id: Foreign key to ``DmRoom``.
        model_id: Foreign key to ``DmDeviceModel``.
        firmware_id: Foreign key to ``DmDeviceFirmware``.
        function_id: Foreign key to ``DmDeviceFunction``.
        target_id: Optional foreign key to another ``DmDevice`` (self-ref).
    """

    mac: str = ""
    ip: Optional[str] = None
    enabled: bool = True
    position_name: str = ""
    position_slug: str = ""
    mode: str = ""
    interlock: str = ""
    ha_device_class: str = ""
    extra: str = ""
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    room_id: Optional[int] = None
    model_id: Optional[int] = None
    firmware_id: Optional[int] = None
    function_id: Optional[int] = None
    target_id: Optional[int] = None

    # ------------------------------------------------------------------
    # Transient fields – populated by repository JOINs, not persisted.
    # ------------------------------------------------------------------
    _room_slug: str = field(default="", repr=False)
    _room_name: str = field(default="", repr=False)
    _level_number: int = field(default=0, repr=False)
    _level_slug: str = field(default="", repr=False)
    _function_name: str = field(default="", repr=False)
    _model_name: str = field(default="", repr=False)
    _firmware_name: str = field(default="", repr=False)

    # ------------------------------------------------------------------
    # Serialization helpers
    # ------------------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the instance to a dict with snake_case keys.

        Fields starting with ``_`` (transient) are excluded.  The ``id`` key
        is omitted when its value is None.

        Returns:
            A dictionary representation suitable for persistence.
        """
        data: Dict[str, Any] = {
            "mac": self.mac,
            "ip": self.ip,
            "enabled": self.enabled,
            "position_name": self.position_name,
            "position_slug": self.position_slug,
            "mode": self.mode,
            "interlock": self.interlock,
            "ha_device_class": self.ha_device_class,
            "extra": self.extra,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "room_id": self.room_id,
            "model_id": self.model_id,
            "firmware_id": self.firmware_id,
            "function_id": self.function_id,
            "target_id": self.target_id,
        }
        if self.id is not None:
            data["id"] = self.id
        return data

    def to_camel_dict(self) -> Dict[str, Any]:
        """Serialize the instance to a dict with camelCase keys.

        Suitable for JSON API responses.  Transient fields are excluded.

        Returns:
            A dictionary with camelCase keys.
        """
        return {_to_camel_case(k): v for k, v in self.to_dict().items()}

    def to_camel_dict_full(self) -> Dict[str, Any]:
        """Serialize all data including computed and transient fields.

        Transient fields are included **without** the leading underscore so
        they can be consumed directly by API clients.  Computed properties
        (``link``, ``mqttTopic``, ``hostname``, ``fqdn``) are also added.

        Returns:
            A complete camelCase dictionary with computed values.
        """
        data = self.to_camel_dict()

        # Include transient fields without leading underscore.
        transient: Dict[str, Any] = {
            "room_slug": self._room_slug,
            "room_name": self._room_name,
            "level_number": self._level_number,
            "level_slug": self._level_slug,
            "function_name": self._function_name,
            "model_name": self._model_name,
            "firmware_name": self._firmware_name,
        }
        for key, value in transient.items():
            data[_to_camel_case(key)] = value

        # Include computed properties.
        data["link"] = self.link()
        data["mqttTopic"] = self.mqtt_topic()
        data["hostname"] = self.hostname()
        data["fqdn"] = self.fqdn()

        return data

    # ------------------------------------------------------------------
    # Computed methods
    # ------------------------------------------------------------------

    def link(self) -> Optional[str]:
        """Return the device URL based on its IP address.

        If *ip* is a plain integer it is treated as the last octet of a
        ``192.168.0.X`` address.  A full dotted IP is used as-is.

        Returns:
            The URL string or ``None`` when no IP is available.
        """
        if not self.ip:
            return None

        if self.ip.isdigit():
            return f"http://192.168.0.{self.ip}"

        return f"http://{self.ip}"

    def mqtt_topic(self) -> Optional[str]:
        """Return the MQTT topic for this device.

        Format: ``home/l{level}/{room_slug}/{function}/{position_slug}``

        The method relies on transient fields populated by JOIN queries.  If
        insufficient data is available, ``None`` is returned.

        Returns:
            The MQTT topic string or ``None``.
        """
        if not self._level_slug or not self._room_slug or not self._function_name:
            return None

        function_slug = self._function_name.lower().replace(" ", "_")
        return (
            f"home/{self._level_slug}/{self._room_slug}"
            f"/{function_slug}/{self.position_slug}"
        )

    def hostname(self) -> Optional[str]:
        """Return the hostname for this device.

        Format: ``{level_slug}_{room_slug}_{function}_{position_slug}``

        Returns:
            The hostname string or ``None`` when transient data is missing.
        """
        if not self._level_slug or not self._room_slug or not self._function_name:
            return None

        function_slug = self._function_name.lower().replace(" ", "_")
        return (
            f"{self._level_slug}_{self._room_slug}"
            f"_{function_slug}_{self.position_slug}"
        )

    def fqdn(self) -> Optional[str]:
        """Return the fully-qualified domain name for this device.

        Format: ``{hostname}.domo.in-res.net``

        Returns:
            The FQDN string or ``None`` when hostname cannot be computed.
        """
        host = self.hostname()
        if host is None:
            return None
        return f"{host}.domo.in-res.net"

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DmDevice":
        """Create an instance from a dictionary.

        Handles both snake_case and camelCase keys transparently.  Transient
        fields can be supplied with or without the leading underscore.

        Args:
            data: Input dictionary with field values.

        Returns:
            A new ``DmDevice`` instance.
        """
        normalized: Dict[str, Any] = {}
        for key, value in data.items():
            normalized[_to_snake_case(key)] = value

        return cls(
            id=normalized.get("id"),
            mac=normalized.get("mac", ""),
            ip=normalized.get("ip", ""),
            enabled=normalized.get("enabled", True),
            position_name=normalized.get("position_name", ""),
            position_slug=normalized.get("position_slug", ""),
            mode=normalized.get("mode", ""),
            interlock=normalized.get("interlock", ""),
            ha_device_class=normalized.get("ha_device_class", ""),
            extra=normalized.get("extra", ""),
            created_at=normalized.get("created_at"),
            updated_at=normalized.get("updated_at"),
            room_id=normalized.get("room_id"),
            model_id=normalized.get("model_id"),
            firmware_id=normalized.get("firmware_id"),
            function_id=normalized.get("function_id"),
            target_id=normalized.get("target_id"),
            # Transient fields.
            _room_slug=normalized.get("room_slug", ""),
            _room_name=normalized.get("room_name", ""),
            _level_number=normalized.get("level_number", 0),
            _level_slug=normalized.get("level_slug", ""),
            _function_name=normalized.get("function_name", ""),
            _model_name=normalized.get("model_name", ""),
            _firmware_name=normalized.get("firmware_name", ""),
        )
