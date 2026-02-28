"""The HA Device Manager integration."""

import logging
from pathlib import Path

from homeassistant.components import frontend
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .api import DeviceAPIView, DevicesAPIView, MainView, StaticView, CSVImportAPIView, DeployAPIView
from .const import DOMAIN
from .database import DatabaseManager

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Device Manager component."""
    _LOGGER.info("Setting up Device Manager")

    # Initialize storage
    hass.data.setdefault(DOMAIN, {})

    # Initialize database in config directory (writable)
    db_path = Path(hass.config.config_dir) / f"{DOMAIN}.db"
    db_manager = DatabaseManager(db_path)
    await db_manager.initialize()

    # Store database manager
    hass.data[DOMAIN]["db"] = db_manager

    # Register API views
    hass.http.register_view(MainView())
    hass.http.register_view(StaticView())
    hass.http.register_view(DevicesAPIView())
    hass.http.register_view(DeviceAPIView())
    hass.http.register_view(CSVImportAPIView())
    hass.http.register_view(DeployAPIView())

    # Register panel in sidebar
    frontend.async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title="panel.title",
        sidebar_icon="mdi:devices",
        frontend_url_path="device_manager",
        config={"url": "/device_manager"},
        require_admin=False,
        config_panel_domain=DOMAIN,
    )

    _LOGGER.info("Device Manager setup complete")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Device Manager from a config entry."""
    _LOGGER.info("Setting up Device Manager config entry")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    _LOGGER.info("Unloadin Device Manager config entry")
    return True
