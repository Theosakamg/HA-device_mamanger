"""API controller for DmLevel CRUD operations."""

from .crud import CrudListView, CrudDetailView


class LevelsAPIView(CrudListView):
    """API endpoint for level list and creation."""

    url = "/api/device_manager/levels"
    name = "api:device_manager:levels"
    repo_key = "level"
    entity_name = "Level"
    filter_param = "home_id"
    filter_method = "find_by_home"


class LevelAPIView(CrudDetailView):
    """API endpoint for individual level operations."""

    url = "/api/device_manager/levels/{entity_id}"
    name = "api:device_manager:level"
    repo_key = "level"
    entity_name = "Level"
