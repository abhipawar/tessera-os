import os
from supabase import create_client, Client

supabase_url: str = os.environ.get("SUPABASE_URL", "")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

_supabase_client: Client = None
_settings_cache = {}

def _get_client():
    global _supabase_client
    if not _supabase_client and supabase_url and supabase_key:
        _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client

def get_system_setting(key: str, default_value: str = None) -> str:
    """Fetch a system setting from the database, falling back to memory cache or default."""
    client = _get_client()
    if not client:
        return default_value
    
    try:
        result = client.table("system_settings").select("value").eq("key", key).execute()
        if result.data and len(result.data) > 0:
            val = result.data[0]["value"]
            _settings_cache[key] = val
            return val
    except Exception as e:
        # Table might not exist yet or connection error
        pass
        
    return _settings_cache.get(key, default_value)
