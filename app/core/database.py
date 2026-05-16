import os
from supabase import create_client, Client

_client: Client | None = None

def get_db() -> Client:
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise ValueError(f"Missing Supabase config. URL={url[:20]}, KEY={key[:10]}")
        _client = create_client(url, key)
    return _client