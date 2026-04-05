import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("c:\\Users\\abhip\\.gemini\\antigravity\\scratch\\tessera\\tessera-os\\apps\\workers\\.env")

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(supabase_url, supabase_key)

response = supabase.table("telemetry_events").select("*").order("timestamp", desc=True).limit(20).execute()

with open("telemetry_out.txt", "w", encoding="utf-8") as f:
    for row in response.data:
        f.write(f"[{row['timestamp']}] {row['action_type']} on {row['url']}\n")
        f.write(f"  Target: {row['target_element']}\n")
        f.write(f"  Context: {row['context_data']}\n")
        f.write("-" * 40 + "\n")
