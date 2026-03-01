"""Base controller utilities for Device Manager API views."""

import logging
import re
from typing import Any

from aiohttp import web

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)


def to_camel_case_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Convert a dict with snake_case keys to camelCase keys.

    Args:
        data: Dict with snake_case keys.

    Returns:
        New dict with camelCase keys.
    """
    result: dict[str, Any] = {}
    for key, value in data.items():
        parts = key.split("_")
        if len(parts) == 1:
            result[key] = value
        else:
            camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
            result[camel] = value
    return result


def to_snake_case_dict(data: dict[str, Any]) -> dict[str, Any]:
    """Convert a dict with camelCase keys to snake_case keys.

    Args:
        data: Dict with camelCase keys.

    Returns:
        New dict with snake_case keys.
    """
    result: dict[str, Any] = {}
    for key, value in data.items():
        snake = re.sub(r"([A-Z])", r"_\1", key).lower().lstrip("_")
        result[snake] = value
    return result


def get_repos(request: web.Request) -> dict:
    """Get the repository dict from the request's hass data.

    Args:
        request: The aiohttp request.

    Returns:
        Dict of repository instances.
    """
    hass = request.app["hass"]
    return hass.data[DOMAIN]["repos"]
