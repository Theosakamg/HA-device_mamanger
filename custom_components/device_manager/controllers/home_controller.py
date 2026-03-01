"""API controller for DmHome CRUD operations."""

from .crud import CrudListView, CrudDetailView


class HomesAPIView(CrudListView):
    """API endpoint for home list and creation."""

    url = "/api/device_manager/homes"
    name = "api:device_manager:homes"
    repo_key = "home"
    entity_name = "Home"


class HomeAPIView(CrudDetailView):
    """API endpoint for individual home operations."""

    url = "/api/device_manager/homes/{entity_id}"
    name = "api:device_manager:home"
    repo_key = "home"
    entity_name = "Home"
