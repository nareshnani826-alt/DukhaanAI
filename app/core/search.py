"""Safe "contains" patterns for Supabase/PostgREST text searches.

postgrest-py puts like/ilike values into the URL without encoding "%", so "%amu%" reached
Supabase as a broken escape ("%am") and its gateway failed with a Cloudflare "Worker threw
exception" page. PostgREST also accepts "*" as the wildcard, which is encoded safely.
"""
import re

# Characters that are wildcards or separators in PostgREST filters
_UNSAFE = re.compile(r"[%*,()\\]")


def clean_term(text: str) -> str:
    """Typed search text with PostgREST special characters removed."""
    return _UNSAFE.sub(" ", text or "").strip()


def contains(text: str) -> str:
    """Pattern for .ilike(column, ...) / "col.ilike.<pattern>" matching text anywhere."""
    return f"*{clean_term(text)}*"
