"""DmHome dataclass model.

Represents a home (top-level location) in the device manager hierarchy.
"""

from dataclasses import dataclass
from typing import Optional

from .base import SerializableMixin


@dataclass
class DmHome(SerializableMixin):
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
