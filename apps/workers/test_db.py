import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

if not db_url:
    print("Error: DATABASE_URL environment variable is not set. Please set it in your .env file or environment.")
    exit(1)
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = [t[0] for t in cur.fetchall()]
print("agent_execution_logs in tables:", "agent_execution_logs" in tables)