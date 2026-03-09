import os
import sys
from dotenv import load_dotenv
from psycopg_pool import ConnectionPool

load_dotenv("c:\\Users\\abhip\\.gemini\\antigravity\\scratch\\tessera\\tessera-os\\apps\\workers\\.env")
DB_URI = os.environ.get("DATABASE_URL")

if not DB_URI:
    print("No DATABASE_URL found.")
    sys.exit(1)

query = """
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name, 
    rc.update_rule, 
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'tenants';
"""

with ConnectionPool(conninfo=DB_URI, kwargs={"prepare_threshold": None}) as pool:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            for r in rows:
                print(r)
