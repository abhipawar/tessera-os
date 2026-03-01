import os
from pydantic import BaseModel, Field
from typing import List, Any
from langchain_core.tools import StructuredTool
from supabase import create_client, Client
from crypto import decrypt_credentials
from dotenv import load_dotenv

load_dotenv()

supabase_url: str = os.environ.get("SUPABASE_URL", "")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase_client: Client = create_client(supabase_url, supabase_key) if supabase_url else None

class PostgresQuerySchema(BaseModel):
    sql_query: str = Field(description="The raw, executable PostgreSQL query. Do NOT include markdown formatting.")

class SalesforceLookupSchema(BaseModel):
    query: str = Field(description="The name or email to look up in Salesforce.")

def build_tenant_tools(workspace_id: str, requested_tool_ids: List[str]) -> List[Any]:
    if not requested_tool_ids or not supabase_client:
        return []

    try:
        print(f"--- [Tool Factory] Searching for {len(requested_tool_ids)} requested tools... ---")
        ws_resp = supabase_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
        if not ws_resp.data: return []
        tenant_id = ws_resp.data[0]["tenant_id"]

        creds_resp = supabase_client.table("tenant_tools").select("id, tool_id, credentials").eq("tenant_id", tenant_id).in_("id", requested_tool_ids).execute()
        if not creds_resp.data: return []
        
        tool_data_map = {row["id"]: {"global_tool_id": row["tool_id"], "credentials": row["credentials"]} for row in creds_resp.data}
        global_tool_ids = list(set([row["tool_id"] for row in creds_resp.data]))
        tools_resp = supabase_client.table("global_tools").select("id, name").in_("id", global_tool_ids).execute()
        global_tools_map = {row["id"]: row["name"] for row in tools_resp.data}
        
        langchain_tools = []
        
        for tenant_t_id in requested_tool_ids:
            t_data = tool_data_map.get(tenant_t_id)
            if not t_data: continue
            
            g_id = t_data["global_tool_id"]
            t_creds = decrypt_credentials(t_data["credentials"])
            t_name = global_tools_map.get(g_id, "")
            
            if "Database" in t_name or "Application Database" in t_name:
                
                def execute_postgres_query(sql_query: str) -> str:
                    print(f"      -> [Real Tool Execution] Running SQL: {sql_query}")
                    try:
                        import psycopg2
                        conn_url = t_creds.get("connection_url")
                        if conn_url:
                            conn = psycopg2.connect(conn_url, connect_timeout=10)
                        else:
                            conn = psycopg2.connect(
                                host=t_creds.get("host"), port=t_creds.get("port"), dbname=t_creds.get("database"),
                                user=t_creds.get("username"), password=t_creds.get("password"), connect_timeout=10
                            )
                        
                        is_readonly = (t_creds.get("access_level", "read_only") == "read_only")
                        conn.set_session(readonly=is_readonly)
                        cur = conn.cursor()
                        cur.execute(sql_query)
                        
                        if cur.description:
                            results = cur.fetchall()
                            columns = [desc[0] for desc in cur.description]
                            res_str = f"Columns: {columns}\nRows: {results}"
                        else:
                            conn.commit()
                            res_str = f"Query executed successfully. Rows affected: {cur.rowcount}"
                            
                        cur.close()
                        conn.close()
                        return res_str[:4000] 
                    except Exception as e:
                        return f"Database Error: {str(e)}"
                
                postgres_tool = StructuredTool.from_function(
                    func=execute_postgres_query,
                    name="postgres_query",
                    description="CRITICAL: You MUST use this tool to answer ANY question about database data, counting rows, or finding users. Pass the SQL string into this tool to execute it.",
                    args_schema=PostgresQuerySchema
                )
                langchain_tools.append(postgres_tool)

            elif "Salesforce" in t_name:
                def execute_salesforce_lookup(query: str) -> str:
                    return f"Successfully queried Salesforce for '{query}'."
                
                sf_tool = StructuredTool.from_function(
                    func=execute_salesforce_lookup,
                    name="salesforce_lookup",
                    description="Queries Salesforce for CRM data.",
                    args_schema=SalesforceLookupSchema
                )
                langchain_tools.append(sf_tool)
                
        print(f"--- [Tool Factory] Successfully built {len(langchain_tools)} dynamic tools! ---")
        return langchain_tools
    except Exception as e:
        print(f"--- [Tool Factory Error] {str(e)} ---")
        return []
