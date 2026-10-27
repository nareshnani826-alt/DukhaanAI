import os

import httpx
from dotenv import load_dotenv
from postgrest.utils import SyncClient
from supabase import create_client, Client

load_dotenv()  # ← this loads the .env file locally

_client: Client | None = None


class _RetryReads(httpx.HTTPTransport):
    """Supabase closes idle connections; a request sent on one fails with
    "Server disconnected" and the page shows an error. Reads are safe to send
    again once. Writes are not retried, so a bill can never be saved twice."""

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        try:
            return super().handle_request(request)
        except (httpx.RemoteProtocolError, httpx.ReadError):
            if request.method not in ("GET", "HEAD"):
                raise
            return super().handle_request(request)


def _steady_session(client: Client) -> None:
    # supabase-py shares one HTTP/2 connection across all server threads, which
    # drops under parallel page loads; plain HTTP/1.1 notices dead idle connections.
    pg = client.postgrest
    old = pg.session
    pg.session = SyncClient(base_url=old.base_url, headers=old.headers, timeout=old.timeout,
                            follow_redirects=True, transport=_RetryReads(retries=2))
    old.close()


def get_db() -> Client:
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise ValueError("Missing Supabase config: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        client = create_client(url, key)
        _steady_session(client)
        _client = client
    return _client
