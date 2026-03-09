import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.environ.get("DATABASE_URL")

try:
    print("Connecting to DB...")
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Updating trigger function handle_new_user...")
    cur.execute("""
        CREATE OR REPLACE FUNCTION public.handle_new_user()
         RETURNS trigger
         LANGUAGE plpgsql
         SECURITY DEFINER
        AS $function$
        begin
          insert into public.profiles (id, email, is_tessera_admin)
          values (new.id, new.email, false);
          return new;
        end;
        $function$;
    """)
    print("Trigger replaced successfully.")
    
except Exception as e:
    print(f"POSTGRES ERROR CAUGHT: {repr(e)}")
