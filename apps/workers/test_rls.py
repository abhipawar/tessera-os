import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
anon_key = os.environ.get('SUPABASE_ANON_KEY')

client = create_client(url, anon_key)
EMAIL = "abhi@tessera.ai"
PASSWORD = "Tessera2026!"  # From the onboarding/auth flow defaults

res = client.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
user_id = res.user.id
print(f"Authenticated as User ID: {user_id}")

try:
    tenant_res = client.table("tenant_members").select("*").eq("user_id", user_id).execute()
    print(f"Rows found for {EMAIL} via User JWT: {len(tenant_res.data)}")
    print(tenant_res.data)
except Exception as e:
    print(f"Error fetching: {e}")
