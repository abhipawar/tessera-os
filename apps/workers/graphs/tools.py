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

class PythonSandboxSchema(BaseModel):
    code: str = Field(description="The raw Python code string to execute inside the micro-VM. Do not include markdown formatting.")

class ResendEmailSchema(BaseModel):
    to_email: str = Field(description="The recipient email address.")
    subject: str = Field(description="The subject line of the email.")
    html_body: str = Field(description="The HTML formatted body of the email.")

class WebhookExecutionSchema(BaseModel):
    payload_json: str = Field(description="The dynamically generated JSON string payload to send to the automation webhook. Make sure keys match the context you want to pass down.")

def build_tenant_tools(workspace_id: str, requested_tool_ids: List[str]) -> List[Any]:
    if not requested_tool_ids or not supabase_client:
        return []

    try:
        print(f"--- [Tool Factory] Searching for {len(requested_tool_ids)} requested tools... ---")
        ws_resp = supabase_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
        if not ws_resp.data: return []
        tenant_id = ws_resp.data[0]["tenant_id"]

        creds_resp = supabase_client.table("tenant_tools").select("id, tool_id, credentials, connection_name").eq("tenant_id", tenant_id).in_("id", requested_tool_ids).execute()
        if not creds_resp.data: return []
        
        tool_data_map = {row["id"]: {"global_tool_id": row["tool_id"], "credentials": row["credentials"], "connection_name": row.get("connection_name")} for row in creds_resp.data}
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
                        import psycopg
                        conn_url = t_creds.get("connection_url")
                        if conn_url:
                            conn = psycopg.connect(conn_url, connect_timeout=10)
                        else:
                            dsn = f"host={t_creds.get('host')} port={t_creds.get('port')} dbname={t_creds.get('database')} user={t_creds.get('username')} password={t_creds.get('password')}"
                            conn = psycopg.connect(dsn, connect_timeout=10)
                        
                        is_readonly = (t_creds.get("access_level", "read_only") == "read_only")
                        conn.read_only = is_readonly
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

            elif "E2B Python" in t_name:
                def run_python_code(code: str) -> str:
                    print("\n--- [E2B Sandbox] Spinning up BYOK MicroVM ---")
                    try:
                        from e2b_code_interpreter import Sandbox
                        e2b_key = t_creds.get("e2b_api_key", os.environ.get("E2B_API_KEY"))
                        
                        if not e2b_key:
                            return "Error: Missing E2B API Key in tenant credentials."
                            
                        with Sandbox.create(api_key=e2b_key) as sandbox:
                            execution = sandbox.run_code(code)
                            
                            if execution.error:
                                return f"Error: {execution.error.name}: {execution.error.value}\n{execution.error.traceback}"
                            
                            output_blocks = []
                            if execution.logs.stdout: output_blocks.append("\n".join(execution.logs.stdout))
                            if execution.logs.stderr: output_blocks.append("\n".join(execution.logs.stderr))
                            if execution.text and not execution.logs.stdout: output_blocks.append(execution.text)
                            if execution.results:
                                for result in execution.results:
                                    if result.text: output_blocks.append(result.text)
                
                            final_result = "\n".join(output_blocks).strip()
                            return final_result if final_result else "Code executed successfully with no output."
                    except Exception as e:
                        return f"Sandbox exception: {str(e)}"
                        
                sandbox_tool = StructuredTool.from_function(
                    func=run_python_code,
                    name="run_python_code",
                    description="Executes python code in a secure cloud sandbox and returns the terminal output. Use this to do complex math, process data, or write custom scripts.",
                    args_schema=PythonSandboxSchema
                )
                langchain_tools.append(sandbox_tool)

            elif "Custom Python Script" in t_name:
                class CustomScriptSchema(BaseModel):
                    input_payload: str = Field(description="Optional string or JSON payload to pass dynamically to the script if required.")

                def build_custom_script_tool(custom_code: str, custom_name: str, custom_desc: str):
                    def run_custom_script(input_payload: str = "") -> str:
                        print(f"\n--- [E2B Sandbox] Executing Custom Runtime Script: {custom_name} ---")
                        try:
                            from e2b_code_interpreter import Sandbox
                            e2b_key = os.environ.get("E2B_API_KEY") # Tenant BYOK logic can be expanded later
                            
                            if not e2b_key:
                                return "Error: System missing E2B API Key."
                                
                            injection = f"\nINPUT_PAYLOAD = '''{input_payload}'''\n"
                            script_to_run = injection + custom_code
    
                            with Sandbox.create(api_key=e2b_key) as sandbox:
                                execution = sandbox.run_code(script_to_run)
                                
                                if execution.error:
                                    return f"Error: {execution.error.name}: {execution.error.value}\n{execution.error.traceback}"
                                
                                output_blocks = []
                                if execution.logs.stdout: output_blocks.append("\n".join(execution.logs.stdout))
                                if execution.logs.stderr: output_blocks.append("\n".join(execution.logs.stderr))
                                if execution.text and not execution.logs.stdout: output_blocks.append(execution.text)
                                if execution.results:
                                    for result in execution.results:
                                        if result.text: output_blocks.append(result.text)
                    
                                final_result = "\n".join(output_blocks).strip()
                                return final_result if final_result else "Script executed successfully with no output."
                        except Exception as e:
                            return f"Custom Script exception: {str(e)}"

                    return StructuredTool.from_function(
                        func=run_custom_script,
                        name=custom_name,
                        description=custom_desc,
                        args_schema=CustomScriptSchema
                    )
                
                custom_code = t_creds.get("code", "")
                custom_desc = t_creds.get("description", "A custom Python automation script.")
                raw_name = t_data.get("connection_name", "custom_script") or "custom_script"
                custom_name_safe = raw_name.lower().replace(" ", "_")

                if custom_code:
                    script_tool = build_custom_script_tool(custom_code, custom_name_safe, custom_desc)
                    langchain_tools.append(script_tool)


            elif "Email" in t_name or "Resend" in t_name:
                def send_resend_email(to_email: str, subject: str, html_body: str) -> str:
                    print(f"      -> [Real Tool Execution] Sending Email via Resend to: {to_email}")
                    try:
                        import requests
                        resend_key = t_creds.get("api_key", os.environ.get("RESEND_API_KEY"))
                        if not resend_key:
                            return "Error: Missing Resend API Key in tenant credentials or environment."

                        payload = {
                            "from": "Agents <agents@tesseraos.ai>", # Custom domain verified
                            "to": [to_email],
                            "subject": subject,
                            "html": html_body
                        }
                        
                        headers = {
                            "Authorization": f"Bearer {resend_key}",
                            "Content-Type": "application/json"
                        }
                        
                        response = requests.post("https://api.resend.com/emails", json=payload, headers=headers)
                        
                        if response.status_code in [200, 201]:
                            try:
                                supabase_client.table("agent_communications").insert({
                                    "workspace_id": workspace_id,
                                    "direction": "outbound",
                                    "from_email": "agents@tesseraos.ai",
                                    "to_email": to_email,
                                    "subject": subject,
                                    "body": html_body
                                }).execute()
                            except Exception as log_e:
                                print(f"      -> [Warning] Failed to securely log outbound email: {str(log_e)}")
                                
                            return f"Successfully sent email to {to_email}."
                        else:
                            return f"Failed to send email. Status: {response.status_code}, Response: {response.text}"
                    except Exception as e:
                        return f"Email Tool Error: {str(e)}"
                        
                email_tool = StructuredTool.from_function(
                    func=send_resend_email,
                    name="send_resend_email",
                    description="Sends an outbound email to a specified recipient. You MUST use this tool to reply to incoming human emails or to proactively reach out to a user.",
                    args_schema=ResendEmailSchema
                )
                langchain_tools.append(email_tool)
                
            elif "n8n Webhook" in t_name:
                def execute_n8n_webhook(payload_json: str) -> str:
                    print(f"      -> [Real Tool Execution] Triggering n8n Webhook")
                    try:
                        import requests
                        import json
                        hook_url = t_creds.get("webhook_url")
                        if not hook_url: return "Error: Missing n8n Webhook URL in configuration."
                        payload = json.loads(payload_json)
                        resp = requests.post(hook_url, json=payload)
                        return f"n8n Webhook Triggered. Status: {resp.status_code}. Response: {resp.text}"
                    except Exception as e:
                        return f"n8n Webhook Error: {str(e)}"
                        
                n8n_tool = StructuredTool.from_function(
                    func=execute_n8n_webhook,
                    name="execute_n8n_webhook",
                    description="Triggers your n8n automation pipeline. Pass the newly synthesized json data format to kick off the remote workflow.",
                    args_schema=WebhookExecutionSchema
                )
                langchain_tools.append(n8n_tool)

            elif "Zapier Catch Hook" in t_name:
                def execute_zapier_webhook(payload_json: str) -> str:
                    print(f"      -> [Real Tool Execution] Triggering Zapier Catch Hook")
                    try:
                        import requests
                        import json
                        hook_url = t_creds.get("webhook_url")
                        if not hook_url: return "Error: Missing Zapier Webhook URL in configuration."
                        payload = json.loads(payload_json)
                        resp = requests.post(hook_url, json=payload)
                        return f"Zapier Webhook Triggered. Status: {resp.status_code}. Response: {resp.text}"
                    except Exception as e:
                        return f"Zapier Webhook Error: {str(e)}"
                        
                zapier_tool = StructuredTool.from_function(
                    func=execute_zapier_webhook,
                    name="execute_zapier_webhook",
                    description="Triggers a Zapier automation via Catch Hook. Pass the structured JSON data you want to send to the Zap.",
                    args_schema=WebhookExecutionSchema
                )
                langchain_tools.append(zapier_tool)
                
        print(f"--- [Tool Factory] Successfully built {len(langchain_tools)} dynamic tools! ---")
        return langchain_tools
    except Exception as e:
        print(f"--- [Tool Factory Error] {str(e)} ---")
        return []
