import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(supabase_url, supabase_key)

def seed_llm_tool():
    print("Seeding AI Compute Engine tool...")
    
    # 1. Create or get "llm" tool_type
    type_res = supabase.table("tool_types").select("id").eq("slug", "llm").execute()
    if type_res.data:
        type_id = type_res.data[0]["id"]
    else:
        insert_res = supabase.table("tool_types").insert({
            "slug": "llm",
            "display_name": "LLM Compute",
            "description": "Large Language Model Providers"
        }).execute()
        type_id = insert_res.data[0]["id"]

    # 2. Create or get "Compute" category
    compute_category_res = supabase.table("tool_categories").select("id").eq("slug", "compute").execute()
    if compute_category_res.data:
        category_id = compute_category_res.data[0]["id"]
    else:
        insert_res = supabase.table("tool_categories").insert({
            "display_name": "Compute & AI Models",
            "slug": "compute",
            "icon_name": "cpu"
        }).execute()
        category_id = insert_res.data[0]["id"]

    # 3. Check if AI Compute Engine exists
    tool_res = supabase.table("global_tools").select("id").eq("type_id", type_id).execute()
    
    config_schema = {
        "provider": { 
            "type": "select", 
            "label": "LLM Provider",
            "options": ["OpenAI", "Anthropic", "Google Gemini", "Groq"], 
            "required": True 
        },
        "api_key": { 
            "type": "password", 
            "label": "API Key",
            "required": True 
        }
    }

    if tool_res.data:
        print("AI Compute Engine already exists. Updating schema...")
        supabase.table("global_tools").update({
            "config_schema": config_schema
        }).eq("id", tool_res.data[0]["id"]).execute()
    else:
        print("Inserting AI Compute Engine...")
        supabase.table("global_tools").insert({
            "name": "AI Compute Engine",
            "description": "Bring your own API key to power agents with OpenAI, Claude, or Gemini.",
            "type_id": type_id,
            "category_id": category_id,
            "logo_icon": "bot",
            "config_schema": config_schema,
            "is_active": True
        }).execute()

    print("Done!")

if __name__ == "__main__":
    seed_llm_tool()
