import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("DATABASE_URL")

# We split the string just to print the host/port without revealing your password
safe_url = db_url.split('@')[-1] if db_url and '@' in db_url else "UNKNOWN"
print(f"Attempting to connect to: {safe_url} ...")

try:
    # We set a 5 second timeout so we don't have to wait 30 seconds
    with psycopg.connect(db_url, connect_timeout=5) as conn:
        print("\n✅ SUCCESS! Database connection established.")
except Exception as e:
    print(f"\n❌ FAILED TO CONNECT: {e}")