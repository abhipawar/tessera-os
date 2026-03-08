import os
import certifi
from supabase import create_client, Client
from dotenv import load_dotenv
import asyncio

load_dotenv()

supabase_url: str = os.environ.get("SUPABASE_URL", "")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Verify SSL Setup
os.environ['SSL_CERT_FILE'] = certifi.where()

supabase: Client = create_client(supabase_url, supabase_key)

async def seed_custom_script_tool():
    print("Fetching tool types and categories...")

    # Fetch IDs
    type_id = ""
    category_id = ""
    
    # Just get the first valid type and category from existing tools
    existing_tool = supabase.table("global_tools").select("type_id, category_id").limit(1).execute()
    
    if existing_tool.data:
        type_id = existing_tool.data[0]["type_id"]
        category_id = existing_tool.data[0]["category_id"]

    if not type_id or not category_id:
        print("Missing required type or category. Aborting.")
        return

    # Check if tool already exists
    existing = supabase.table("global_tools").select("*").eq("name", "Custom Python Script").execute()
    
    if existing.data:
        print("Custom Python Script tool already exists. Skipping insertion.")
        return

    config_schema = {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "title": "Python Script",
                "description": "The exact Python code to execute in the secure sandbox.",
                "ui:widget": "textarea"
            },
            "description": {
                "type": "string",
                "title": "Tool Description (For AI)",
                "description": "Explain when the AI should use this script."
            }
        },
        "required": ["code", "description"]
    }

    print("Inserting Custom Python Script tool...")
    
    result = supabase.table("global_tools").insert({
        "name": "Custom Python Script",
        "description": "Execute secure, sandboxed custom Python scripts via E2B to analyze data or perform logic for the agent.",
        "logo_icon": "FileCode2", 
        "is_active": True,
        "config_schema": config_schema,
        "type_id": type_id,
        "category_id": category_id
    }).execute()

    print(f"Successfully inserted: {result.data[0]['name']}")

if __name__ == "__main__":
    asyncio.run(seed_custom_script_tool())
