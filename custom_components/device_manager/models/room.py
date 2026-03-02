"""DmRoom dataclass model.

Represents a room belonging to a level in the device manager hierarchy.
"""

from dataclasses import dataclass
from typing import Optional

from .base import SerializableMixin


@dataclass
class DmRoom(SerializableMixin):
    """Dataclass representing a room within a level.

    Attributes:
        level_id: Foreign key referencing the parent ``DmLevel``. Required.
        name: Display name of the room.
        slug: URL-friendly identifier.
        description: Short description (max 255 characters).
        image: Path or URL to an image representing the room.
        id: Primary key (auto-increment). None for new records.
        created_at: Timestamp when the record was created.
        updated_at: Timestamp when the record was last updated.
    """

    level_id: int = 0
    name: str = ""
    slug: str = ""
    description: str = ""
    image: str = ""
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
