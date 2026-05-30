"""
Simple per-process in-memory TTL cache.

Why not Redis? At 200 users a single-process cache already cuts 80%+ of
repeat DB reads within the same worker. Add Redis later when you scale
to multiple workers / instances.

Usage:
    from app.core.cache import cache_get, cache_set, cache_bust

    # Read
    data = cache_get(f"products:{vendor_id}", ttl=30)
    if data is None:
        data = ... # fetch from DB
        cache_set(f"products:{vendor_id}", data)

    # Invalidate after a write
    cache_bust(f"products:{vendor_id}")
"""

import time
from typing import Any

_store: dict[str, tuple[float, Any]] = {}


def cache_get(key: str, ttl: int) -> Any | None:
    """Return cached value if it exists and is younger than `ttl` seconds."""
    entry = _store.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.time() - ts < ttl:
        return value
    # Expired — evict lazily
    _store.pop(key, None)
    return None


def cache_set(key: str, value: Any) -> None:
    """Store a value in the cache."""
    _store[key] = (time.time(), value)


def cache_bust(prefix: str) -> None:
    """Remove every entry whose key starts with `prefix`."""
    to_delete = [k for k in _store if k.startswith(prefix)]
    for k in to_delete:
        del _store[k]
