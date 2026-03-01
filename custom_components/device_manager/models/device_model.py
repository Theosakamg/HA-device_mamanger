"""DmDeviceModel dataclass model.

Represents a device model (hardware reference / template) in the device manager.
"""

from dataclasses import dataclass, field
from datetime import datetime
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
class DmDeviceModel:
    """Dataclass representing a device model.

    Attributes:
        id: Primary key (auto-increment). None for new records.
        enabled: Whether this device model is active.
        name: Display name of the device model.
        template: Template content associated with the model.
        created_at: Timestamp when the record was created.
        updated_at: Timestamp when the record was last updated.
    """

    enabled: bool = True
    name: str = ""
    template: str = ""
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the instance to a dict with snake_case keys.

        Returns:
            A dictionary representation. The ``id`` key is omitted when None.
        """
        data: Dict[str, Any] = {
            "enabled": self.enabled,
            "name": self.name,
            "template": self.template,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self.id is not None:
            data["id"] = self.id
        return data

    def to_camel_dict(self) -> Dict[str, Any]:
        """Serialize the instance to a dict with camelCase keys.

        Suitable for JSON API responses.

        Returns:
            A dictionary with camelCase keys. The ``id`` key is omitted when
            None.
        """
        return {_to_camel_case(k): v for k, v in self.to_dict().items()}

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DmDeviceModel":
        """Create an instance from a dictionary.

        Handles both snake_case and camelCase keys transparently.

        Args:
            data: Input dictionary with field values.

        Returns:
            A new ``DmDeviceModel`` instance.
        """
        normalized: Dict[str, Any] = {}
        for key, value in data.items():
            normalized[_to_snake_case(key)] = value

        return cls(
            id=normalized.get("id"),
            enabled=normalized.get("enabled", True),
            name=normalized.get("name", ""),
            template=normalized.get("template", ""),
            created_at=normalized.get("created_at"),
            updated_at=normalized.get("updated_at"),
        )
