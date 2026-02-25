import os
import json
from langchain_core.tools import tool
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv

load_dotenv()

DB_URI = os.environ.get("DATABASE_URL")
# We use a global pool for the tools to keep connections efficient
pool = ConnectionPool(conninfo=DB_URI, kwargs={"prepare_threshold": None})

@tool
def run_sql_query(query: str) -> str:
    """
    Executes a read-only SQL query against the Postgres database and returns the results.
    Use this tool ONLY when you need to fetch actual data, metrics, or records to answer the user.
    """
    print(f"      -> [Tool Execution] Running SQL: {query}")
    
    # SECURITY: A very basic guardrail to prevent the AI from dropping your tables!
    forbidden_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE"]
    if any(keyword in query.upper() for keyword in forbidden_keywords):
        return "Error: This tool is strictly for read-only SELECT queries."

    try:
        with pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                
                # Fetch column names
                columns = [desc[0] for desc in cur.description] if cur.description else []
                
                # Fetch all rows
                rows = cur.fetchall()
                
                # Format the results into a list of dictionaries (JSON friendly)
                results = []
                for row in rows:
                    results.append(dict(zip(columns, row)))
                    
                # Return the data as a JSON string so the LLM can read it
                return json.dumps(results, default=str)
                
    except Exception as e:
        return f"Database Error: {str(e)}"

# We keep a dictionary of available tools so the compiler can easily look them up by name
AVAILABLE_TOOLS = {
    "run_sql_query": run_sql_query
}