import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DB_URI = os.environ.get("DATABASE_URL")

try:
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor()
    
    # Check if column exists
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='workspaces' AND column_name='user_id';
    """)
    if cur.fetchone():
        print("Dropping user_id column from workspaces...")
        cur.execute('ALTER TABLE "public"."workspaces" DROP COLUMN "user_id" CASCADE;')
        conn.commit()
        print("Successfully dropped user_id column.")
    else:
        print("Column user_id does not exist on workspaces.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
