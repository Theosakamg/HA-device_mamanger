"""DmHome dataclass model.

Represents a home (top-level location) in the device manager hierarchy.
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
class DmHome:
    """Dataclass representing a home location.

    Attributes:
        id: Primary key (auto-increment). None for new records.
        name: Display name of the home.
        slug: URL-friendly identifier.
        description: Short description (max 255 characters).
        image: Path or URL to an image representing the home.
        created_at: Timestamp when the record was created.
        updated_at: Timestamp when the record was last updated.
    """

    name: str = ""
    slug: str = ""
    description: str = ""
    image: str = ""
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the instance to a dict with snake_case keys.

        Returns:
            A dictionary representation. The ``id`` key is omitted when None.
        """
        data: Dict[str, Any] = {
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "image": self.image,
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
    def from_dict(cls, data: Dict[str, Any]) -> "DmHome":
        """Create an instance from a dictionary.

        Handles both snake_case and camelCase keys transparently.

        Args:
            data: Input dictionary with field values.

        Returns:
            A new ``DmHome`` instance.
        """
        normalized: Dict[str, Any] = {}
        for key, value in data.items():
            normalized[_to_snake_case(key)] = value

        return cls(
            id=normalized.get("id"),
            name=normalized.get("name", ""),
            slug=normalized.get("slug", ""),
            description=normalized.get("description", ""),
            image=normalized.get("image", ""),
            created_at=normalized.get("created_at"),
            updated_at=normalized.get("updated_at"),
        )
