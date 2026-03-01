import psycopg2
db_url = 'postgresql://postgres.zxbqdlpdgffshgdbuyxy:XDYIbIsvvFMQvIeQ@aws-0-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require'
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = [t[0] for t in cur.fetchall()]
print("agent_execution_logs in tables:", "agent_execution_logs" in tables)