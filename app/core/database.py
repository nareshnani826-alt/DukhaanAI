from supabase import create_client, Client
from app.core.config import settings

# Service-role client — bypasses RLS, used in all API routes.
# We enforce vendor isolation ourselves via JWT vendor_id.
_client: Client | None = None


def get_db() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_key,
        )
    return _client
