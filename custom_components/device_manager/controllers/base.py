"""Base controller utilities for Device Manager API views."""

import logging
from typing import Any

from aiohttp import web
from homeassistant.components.http import HomeAssistantView

from ..const import DOMAIN
from ..utils.case_convert import to_camel_case_dict, to_snake_case_dict

_LOGGER = logging.getLogger(__name__)


# Re-export for backward compatibility with existing controller imports.
__all__ = ["to_camel_case_dict", "to_snake_case_dict", "get_repos", "get_db_path"]


def get_repos(request: web.Request) -> dict[str, Any]:
    """Return the shared repository dict.

    Single coupling point between controllers and hass.data.  All
    controllers must go through this helper instead of accessing
    ``hass.data[DOMAIN]`` directly.
    """
    hass = request.app["hass"]
    repos: dict[str, Any] = hass.data[DOMAIN]["repos"]
    return repos


def get_db_path(request: web.Request):
    """Return the SQLite database Path from the app stack.

    Use this to pass a plain ``Path`` to executor jobs (provisioning
    layer) so they can open their own short-lived connection without
    any dependency on the HA event loop or the shared DatabaseManager.
    """
    hass = request.app["hass"]
    return hass.data[DOMAIN]["db"].db_path


class BaseView(HomeAssistantView):
    """Base view with common utilities for Device Manager API controllers."""

    requires_auth = True

