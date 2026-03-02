import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
admin_client = create_client(url, service_key)

print("Checking `workspaces` table schema...")
res = admin_client.table("workspaces").select("*").limit(1).execute()
if res.data:
    print(res.data[0].keys())
else:
    print("No rows in workspaces table, cannot infer schema this way easily without raw query.")
    
# Or query information_schema if possible via postgrest? Not supported directly, so we'll just insert a dummy or look at the data if it exists.
