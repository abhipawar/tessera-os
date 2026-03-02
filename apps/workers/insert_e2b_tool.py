import os
import psycopg2
from dotenv import load_dotenv
import json

load_dotenv()
DB_URI = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()
    
    cur.execute("SELECT type_id, category_id FROM public.global_tools WHERE type_id IS NOT NULL AND category_id IS NOT NULL LIMIT 1;")
    res = cur.fetchone()
    type_id = res[0] if res else None
    cat_id = res[1] if res else None
    
    config_schema_json = json.dumps([{"name": "e2b_api_key", "label": "E2B API Key", "type": "password", "required": True}])
    
    cur.execute("""
        INSERT INTO "public"."global_tools" ("name", "description", "logo_icon", "config_schema", "type_id", "category_id")
        VALUES (%s, %s, %s, %s, %s, %s)
    """, ('E2B Python Code Sandbox', 'Dynamic Python script execution engine via E2B secure cloud Sandboxing.', 'TerminalSquare', config_schema_json, type_id, cat_id))
    
    conn.commit()
    print("Successfully inserted E2B tool into global_tools table.")
        
    cur.close()
    conn.close()
except psycopg2.Error as e:
    print(f"Postgres Error: {e.pgerror}")
except Exception as e:
    print(f"Error: {e}")
