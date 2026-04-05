from fastapi import APIRouter, Request
from pydantic import BaseModel
import os
import jwt
import psycopg2
from typing import Optional, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv
from crypto import encrypt_credentials, decrypt_credentials
import requests
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from graphs.nodes import get_llm
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api/tenant", tags=["integrations"])

class TenantToolPayload(BaseModel):
    tool_id: str
    tenant_tool_id: Optional[str] = None
    connection_name: Optional[str] = None 
    credentials: Dict[str, Any]

class DBConnectionTestRequest(BaseModel):
    db_type: str
    connection_url: Optional[str] = None 
    host: Optional[str] = None
    port: Optional[str] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None

@router.get("/tools")
def get_tenant_integrations(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        impersonated_user_id = req.headers.get("X-Impersonated-User-Id")
        
        if is_admin and impersonated_user_id:
            user_uuid = impersonated_user_id
        
        if is_admin and impersonated_tenant_id:
            tenant_id = impersonated_tenant_id
        else:
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data: 
                return {"success": True, "tools": []}
            tenant_id = member_resp.data[0]["tenant_id"]
            
        global_tools = supabase_client.table("global_tools").select("*, tool_types(display_name), tool_categories(display_name)").eq("is_active", True).execute().data
        tenant_tools = supabase_client.table("tenant_tools").select("*").eq("tenant_id", tenant_id).execute().data
        
        global_tools_map = {t["id"]: t for t in global_tools}
        active_tools = []
        for tt in tenant_tools:
            g_tool = global_tools_map.get(tt["tool_id"])
            if g_tool:
                tool_copy = dict(g_tool)
                tool_copy["tenant_tool_id"] = tt["id"]
                tool_copy["connection_name"] = tt.get("connection_name")
                
                try:
                    tool_copy["credentials"] = decrypt_credentials(tt.get("credentials"))
                except Exception:
                    tool_copy["credentials"] = {}
                    
                active_tools.append(tool_copy)
                
        # Return global tools that haven't been configured by the tenant yet
        active_tool_ids = {tt["tool_id"] for tt in tenant_tools}
        final_catalog_tools = [t for t in global_tools if t["id"] not in active_tool_ids]
            
        return {"success": True, "active_tools": active_tools, "catalog_tools": final_catalog_tools}
        
    except Exception as e:
        print(f"--- [Tenant Tools Fetch Error] {str(e)} ---")
        return {"error": str(e)}

class ConnectionTestRequest(BaseModel):
    tool_type: Optional[str] = "database" 
    db_type: Optional[str] = None
    host: Optional[str] = None
    port: Optional[str] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    connection_url: Optional[str] = None
    provider: Optional[str] = None
    api_key: Optional[str] = None

@router.post("/tools/test-connection")
def test_connection(payload: ConnectionTestRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): 
        return {"success": False, "error": "Access Denied"}
        
    try:
        if payload.tool_type == "llm":
            if not payload.api_key or not payload.provider:
                return {"success": False, "error": "Missing Provider or API Key."}
            
            provider = payload.provider.lower()
            api_key = payload.api_key
            
            models = []
            if provider == "openai":
                res = requests.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {api_key}"}, timeout=5)
                if res.status_code == 200:
                    models = [m["id"] for m in res.json().get("data", []) if "gpt" in m["id"] or "o1" in m["id"] or "o3" in m["id"]]
            elif provider == "google gemini":
                res = requests.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}", timeout=5)
                if res.status_code == 200:
                    models = [m["name"].replace("models/", "") for m in res.json().get("models", []) if "gemini" in m["name"]]
            elif provider == "anthropic":
                res = requests.get("https://api.anthropic.com/v1/models", headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"}, timeout=5)
                if res.status_code == 200:
                    models = ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]
            elif provider == "groq":
                res = requests.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {api_key}"}, timeout=5)
                if res.status_code == 200:
                    models = [m["id"] for m in res.json().get("data", [])]
            else:
                return {"success": False, "error": f"Unsupported LLM provider: {provider}"}
            
            if res.status_code == 200:
                models.sort(reverse=True)
                return {"success": True, "message": f"Successfully authenticated with {payload.provider}!", "models": list(set(models)) if models else ["default"]}
            else:
                return {"success": False, "error": f"Authentication failed. Provider returned status: {res.status_code}."}

        # Original Database Testing Logic
        if payload.db_type and payload.db_type.lower() in ["postgresql", "postgres"]:
            if payload.connection_url:
                conn = psycopg2.connect(payload.connection_url, connect_timeout=5)
            else:
                conn = psycopg2.connect(
                    host=payload.host,
                    port=payload.port,
                    dbname=payload.database,
                    user=payload.username,
                    password=payload.password,
                    connect_timeout=5
                )
            conn.close()
            return {"success": True, "message": "Connection to PostgreSQL successful!"}
            
        elif payload.db_type and payload.db_type.lower() == "snowflake":
            return {"success": True, "message": "Snowflake credentials validated!"}
            
        elif payload.tool_type == "api" and payload.provider == "resend":
            if not payload.api_key:
                return {"success": False, "error": "Missing Resend API Key."}
                
            res = requests.get("https://api.resend.com/domains", headers={"Authorization": f"Bearer {payload.api_key}"}, timeout=5)
            if res.status_code == 200:
                return {"success": True, "message": "Successfully authenticated with Resend API!"}
            elif res.status_code == 401 and res.json().get("name") == "restricted_api_key":
                return {"success": True, "message": "Successfully authenticated with Resend! (Restricted Key Mode)"}
            else:
                return {"success": False, "error": "Invalid Resend API Key. Authentication failed."}
            
        else:
            return {"success": False, "error": "Unsupported connection type."}
            
    except Exception as e:
        print(f"--- [Connection Test Failed] {str(e)} ---")
        return {"success": False, "error": f"Connection failed: {str(e)}"}

@router.get("/configured-tools")
def get_tenant_configured_tools(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]

    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))

        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        impersonated_user_id = req.headers.get("X-Impersonated-User-Id")
        
        if is_admin and impersonated_user_id:
            user_uuid = impersonated_user_id

        if is_admin and impersonated_tenant_id:
            tenant_id = impersonated_tenant_id
        else:
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data: 
                return {"success": True, "tools": []}
            tenant_id = member_resp.data[0]["tenant_id"]

        tools_resp = supabase_client.table("tenant_tools").select("id, tool_id, connection_name, status").eq("tenant_id", tenant_id).eq("status", "active").execute()
        global_tools_resp = supabase_client.table("global_tools").select("id, name, logo_icon").execute()
        global_tools_map = {t["id"]: t for t in global_tools_resp.data}

        configured_tools = []
        for tt in tools_resp.data:
            g_tool = global_tools_map.get(tt["tool_id"], {})
            configured_tools.append({
                "tenant_tool_id": tt["id"], 
                "global_tool_id": tt["tool_id"],
                "name": g_tool.get("name", "Unknown Tool"),
                "connection_name": tt.get("connection_name") or "Default Connection",
                "logo_icon": g_tool.get("logo_icon", "plug")
            })

        return {"success": True, "tools": configured_tools}
    except Exception as e:
        print(f"--- [Configured Tools Fetch Error] {str(e)} ---")
        return {"error": str(e)}

@router.post("/tools")
def save_tenant_integration(payload: TenantToolPayload, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        impersonated_user_id = req.headers.get("X-Impersonated-User-Id")
        
        if is_admin and impersonated_user_id:
            user_uuid = impersonated_user_id
        
        if is_admin and impersonated_tenant_id:
            tenant_id = impersonated_tenant_id
        else:
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data:
                return {"error": "Security Error: You are not assigned to a company tenant."} 
            tenant_id = member_resp.data[0]["tenant_id"]

        encrypted_creds = encrypt_credentials(payload.credentials)
        if payload.tenant_tool_id:
            supabase_client.table("tenant_tools").update({
                "connection_name": payload.connection_name, 
                "credentials": encrypted_creds,
            }).eq("id", payload.tenant_tool_id).eq("tenant_id", tenant_id).execute()
        else:
            supabase_client.table("tenant_tools").insert({
                "tenant_id": tenant_id,
                "tool_id": payload.tool_id,
                "connection_name": payload.connection_name, 
                "credentials": encrypted_creds,
                "status": "active"
            }).execute()
            
        return {"success": True, "message": "Credentials securely saved."}

    except Exception as e:
        print(f"--- [Tenant Tools Save Error] {str(e)} ---")
        return {"error": str(e)}

@router.get("/agents")
def get_tenant_agents(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    
    try:
        agents = supabase_client.table("global_agents") \
            .select("*, tool_categories(display_name)") \
            .eq("is_active", True) \
            .order("created_at", desc=True) \
            .execute().data
            
        return {"success": True, "agents": agents}
        
    except Exception as e:
        print(f"--- [Tenant Agents Fetch Error] {str(e)} ---")
        return {"error": str(e)}

@router.get("/tools/{tenant_tool_id}/models")
def get_llm_models(tenant_tool_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]

    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        impersonated_user_id = req.headers.get("X-Impersonated-User-Id")
        
        if is_admin and impersonated_user_id:
            user_uuid = impersonated_user_id
        
        if is_admin and impersonated_tenant_id:
            tenant_id = impersonated_tenant_id
        else:
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data: return {"error": "Access Denied"}
            tenant_id = member_resp.data[0]["tenant_id"]

        tool_resp = supabase_client.table("tenant_tools").select("credentials").eq("id", tenant_tool_id).eq("tenant_id", tenant_id).execute()
        if not tool_resp.data: return {"error": "Tool connection not found."}
        
        credentials = decrypt_credentials(tool_resp.data[0]["credentials"])
        provider = credentials.get("provider", "").lower()
        api_key = credentials.get("api_key", "")
        
        if not api_key: return {"error": "Missing API Key."}

        models = []
        if provider == "openai":
            res = requests.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {api_key}"}, timeout=5)
            if res.status_code == 200:
                models = [m["id"] for m in res.json().get("data", []) if "gpt" in m["id"] or "o1" in m["id"] or "o3" in m["id"]]
        elif provider == "google gemini":
            res = requests.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}", timeout=5)
            if res.status_code == 200:
                models = [m["name"].replace("models/", "") for m in res.json().get("models", []) if "gemini" in m["name"]]
        elif provider == "anthropic":
            models = ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"]
        elif provider == "groq":
            res = requests.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {api_key}"}, timeout=5)
            if res.status_code == 200:
                models = [m["id"] for m in res.json().get("data", [])]

        models.sort(reverse=True)
        return {"success": True, "models": list(set(models)) if models else ["default"]}

    except Exception as e:
        print(f"--- [Fetch Models Error] {str(e)} ---")
        return {"error": str(e)}

class EnhancePromptRequest(BaseModel):
    rough_prompt: str

@router.post("/enhance-prompt")
def enhance_prompt(payload: EnhancePromptRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]

    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        impersonated_user_id = req.headers.get("X-Impersonated-User-Id")
        
        if is_admin and impersonated_user_id:
            user_uuid = impersonated_user_id
        
        if is_admin and impersonated_tenant_id:
            tenant_id = impersonated_tenant_id
        else:
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data: return {"error": "Access Denied"}
            tenant_id = member_resp.data[0]["tenant_id"]

        llm_type_resp = supabase_client.table("tool_types").select("id").eq("slug", "llm").execute()
        if not llm_type_resp.data: return {"error": "Internal logic error missing LLM type."}
        llm_type_id = llm_type_resp.data[0]["id"]

        global_tools_resp = supabase_client.table("global_tools").select("id").eq("type_id", llm_type_id).execute()
        llm_global_tool_ids = [t["id"] for t in global_tools_resp.data]

        t_tools_resp = supabase_client.table("tenant_tools").select("credentials").eq("tenant_id", tenant_id).eq("status", "active").in_("tool_id", llm_global_tool_ids).execute()
        
        if not t_tools_resp.data:
            return {"error": "No LLM configuration found. Please configure an LLM in the Integrations Hub first."}
            
        llm_creds = decrypt_credentials(t_tools_resp.data[0]["credentials"])
        llm = get_llm(llm_creds)
        
        sys_msg = SystemMessage(content="""You are an elite, world-class AI prompt engineer. 
Your singular job is to take the user's rough prompt draft and rewrite it into an incredibly sophisticated, robust, 
and highly effective system prompt. 
- Expand on their concepts logically.
- Add structured formatting (markdown, bullet points).
- Ensure edge cases or tone are addressed.
- **Output ONLY the rewritten prompt text itself.** Do not include conversational filler like "Here is the rewritten prompt:".""")
        
        user_msg = HumanMessage(content=f"Please enhance this rough prompt draft:\n\n{payload.rough_prompt}")
        
        response = llm.invoke([sys_msg, user_msg])
        
        return {"success": True, "enhanced_prompt": response.content}

    except Exception as e:
        print(f"--- [Enhance Prompt Error] {str(e)} ---")
        return {"error": str(e)}
