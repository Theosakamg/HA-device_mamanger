"""DmLevel dataclass model.

Represents a level (floor) belonging to a home in the device manager hierarchy.
"""

from dataclasses import dataclass
from typing import Optional

from .base import SerializableMixin


@dataclass
class DmLevel(SerializableMixin):
    """Dataclass representing a level (floor) within a home.

    Attributes:
        home_id: Foreign key referencing the parent ``DmHome``. Required.
        name: Display name of the level.
        slug: URL-friendly identifier.
        description: Short description (max 255 characters).
        image: Path or URL to an image representing the level.
        id: Primary key (auto-increment). None for new records.
        created_at: Timestamp when the record was created.
        updated_at: Timestamp when the record was last updated.
    """

    home_id: int = 0
    name: str = ""
    slug: str = ""
    description: str = ""
    image: str = ""
    id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
