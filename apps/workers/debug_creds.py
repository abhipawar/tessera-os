import os, sys
sys.path.append(".")
from crypto import decrypt_credentials
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
rows = client.table("tenant_tools").select("*").execute().data

for r in rows:
    creds = decrypt_credentials(r.get("credentials"))
    print(r["connection_name"], type(creds), creds)
