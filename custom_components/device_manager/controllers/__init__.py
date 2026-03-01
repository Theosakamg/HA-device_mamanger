"""Controller layer (API views) for Device Manager."""

from .static_controller import MainView, StaticView
from .home_controller import HomesAPIView, HomeAPIView
from .level_controller import LevelsAPIView, LevelAPIView
from .room_controller import RoomsAPIView, RoomAPIView
from .device_controller import DevicesAPIView, DeviceAPIView
from .device_model_controller import DeviceModelsAPIView, DeviceModelAPIView
from .device_firmware_controller import DeviceFirmwaresAPIView, DeviceFirmwareAPIView
from .device_function_controller import DeviceFunctionsAPIView, DeviceFunctionAPIView
from .hierarchy_controller import HierarchyAPIView
from .import_controller import CSVImportAPIView
from .export_controller import ExportAPIView
from .maintenance_controller import MaintenanceCleanDBAPIView
from .settings_controller import SettingsAPIView

ALL_VIEWS = [
    MainView,
    StaticView,
    HomesAPIView,
    HomeAPIView,
    LevelsAPIView,
    LevelAPIView,
    RoomsAPIView,
    RoomAPIView,
    DevicesAPIView,
    DeviceAPIView,
    DeviceModelsAPIView,
    DeviceModelAPIView,
    DeviceFirmwaresAPIView,
    DeviceFirmwareAPIView,
    DeviceFunctionsAPIView,
    DeviceFunctionAPIView,
    HierarchyAPIView,
    CSVImportAPIView,
    ExportAPIView,
    MaintenanceCleanDBAPIView,
    SettingsAPIView,
]
