import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute("""
        ALTER TABLE "public"."workspaces" 
        ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
        
        CREATE INDEX IF NOT EXISTS "workspaces_status_idx" ON "public"."workspaces" ("status");
    """)
    print("Migration applied successfully!")
    conn.close()
except Exception as e:
    print(f"Error applying migration: {e}")
