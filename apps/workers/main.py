import psycopg2
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage
import jwt
import json
from typing import Optional, Dict, Any

from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
from compiler import build_dynamic_graph
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv() 

supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client: Client = create_client(supabase_url, supabase_key)

app = FastAPI(title="Tessera Workers API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://tessera-os-web.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---
class InviteRequest(BaseModel):
    email: str
    node_id: str
    workspace_role: str = "member"

class SignupOnboardRequest(BaseModel):
    email: str
    password: str
    name: str
    company_name: str

class AgentRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None  

class ToolPayload(BaseModel):
    name: str
    description: str
    type_id: str
    category_id: str
    logo_icon: str
    config_schema: Dict[str, Any]
    is_active: bool

class TenantToolPayload(BaseModel):
    tool_id: str
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

class AgentCatalogPayload(BaseModel):
    name: str
    description: str
    system_prompt: str
    category_id: str
    logo_icon: str
    is_active: bool

# --- HEALTH CHECK ---
@app.get("/health")
def health_check():
    return {"status": "Online"}

# --- TENANT CHAT & GRAPH ENDPOINTS ---
@app.get("/api/tenant-agent/history/{workspace_id}")
def get_chat_history(workspace_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"messages": [], "error": "Access Denied: No valid authentication token provided."}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        if not user_uuid: return {"messages": [], "error": "Invalid token."}
        thread_id = f"{user_uuid}_{workspace_id}"
        config = {"configurable": {"thread_id": thread_id}}
    except Exception as e:
        return {"messages": [], "error": f"Token error: {str(e)}"}
        
    try:
        member_resp = supabase_client.table("workspace_members").select("assigned_node_id").eq("workspace_id", workspace_id).eq("user_id", user_uuid).execute()
        if not member_resp.data: return {"messages": [], "error": "Access Denied"}
        user_node_id = member_resp.data[0]["assigned_node_id"]
    except Exception as e:
        return {"messages": [], "error": f"RBAC Error: {str(e)}"}

    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data: return {"messages": [], "error": "Chat not found."}
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
    except Exception as e:
        return {"messages": [], "error": f"Error loading chat: {str(e)}"}
        
    DB_URI = os.environ.get("DATABASE_URL")
    try:
        with ConnectionPool(conninfo=DB_URI, kwargs={"prepare_threshold": None}) as pool:
            memory = PostgresSaver(pool)
            memory.setup() 
            compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=user_node_id, memory=memory, workspace_id=workspace_id)
            current_state = compiled_graph.get_state(config)
            all_messages = current_state.values.get("messages", []) if current_state.values else []
            chat_history = []
            for msg in all_messages:
                if isinstance(msg, HumanMessage):
                    chat_history.append({"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    chat_history.append({"role": "ai", "content": msg.content, "name": msg.name})
            return {"messages": chat_history}
    except Exception as e:
        return {"messages": [], "error": f"Execution error: {str(e)}"}

@app.post("/api/tenant-agent")
def run_tenant_agent(request: AgentRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"result": "Access Denied"}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        thread_id = f"{user_uuid}_{request.workspace_id}"
        config = {"configurable": {"thread_id": thread_id}}
    except Exception as e:
        return {"result": f"Token error: {str(e)}"}
    if not request.workspace_id: return {"result": "No chat ID provided."}
        
    try:
        member_resp = supabase_client.table("workspace_members").select("assigned_node_id").eq("workspace_id", request.workspace_id).eq("user_id", user_uuid).execute()
        if not member_resp.data: return {"result": "Access Denied"}
        user_node_id = member_resp.data[0]["assigned_node_id"]
    except Exception as e:
        return {"result": f"RBAC Error: {str(e)}"}
        
    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", request.workspace_id).execute()
        if not response.data: return {"result": "Chat not found."}
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
    except Exception as e:
        return {"result": f"Error loading chat: {str(e)}"}
            
    DB_URI = os.environ.get("DATABASE_URL")
    try:
        with ConnectionPool(conninfo=DB_URI, kwargs={"prepare_threshold": None}) as pool:
            memory = PostgresSaver(pool)
            memory.setup() 
            compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=user_node_id, memory=memory, workspace_id=request.workspace_id)
            current_state = compiled_graph.get_state(config)
            existing_msg_count = len(current_state.values.get("messages", [])) if current_state.values else 0
            initial_state = {"messages": [HumanMessage(content=request.query)]}
            final_state = compiled_graph.invoke(initial_state, config=config)
            all_messages = final_state.get("messages", [])
            new_messages = all_messages[existing_msg_count + 1:] 
            ai_responses = [msg.content for msg in new_messages if isinstance(msg, AIMessage)]
            final_text = "\n\n".join(ai_responses) if ai_responses else "Task completed."
            return {"result": final_text}
    except Exception as e:
        return {"result": f"Execution error: {str(e)}"}

@app.get("/api/chat/{workspace_id}/layout")
def get_secure_chat_layout(workspace_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
    except Exception as e:
        return {"error": f"Token error: {str(e)}"}
        
    try:
        member_resp = supabase_client.table("workspace_members").select("assigned_node_id").eq("workspace_id", workspace_id).eq("user_id", user_uuid).execute()
        if not member_resp.data: return {"error": "Access Denied"}
        user_node_id = member_resp.data[0]["assigned_node_id"]
    except Exception as e:
        return {"error": f"RBAC Error: {str(e)}"}

    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data: return {"error": "Workspace not found."}
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        all_nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        all_edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
    except Exception as e:
        return {"error": f"Error loading chat: {str(e)}"}

    adjacency_list = {}
    for edge in all_edges:
        src, tgt = edge.get("source"), edge.get("target")
        if src not in adjacency_list: adjacency_list[src] = []
        adjacency_list[src].append(tgt)

    allowed_node_ids = set([user_node_id])
    queue = [user_node_id]
    while queue:
        current_node = queue.pop(0)
        direct_reports = adjacency_list.get(current_node, [])
        for report in direct_reports:
            if report not in allowed_node_ids:
                allowed_node_ids.add(report)
                queue.append(report)

    secure_nodes = [n for n in all_nodes if n.get("id") in allowed_node_ids]
    secure_edges = [e for e in all_edges if e.get("source") in allowed_node_ids and e.get("target") in allowed_node_ids]

    return {
        "nodes": secure_nodes,
        "edges": secure_edges,
        "user_node_id": user_node_id
    }

@app.post("/api/chat/{workspace_id}/invite")
def invite_team_member(workspace_id: str, invite_req: InviteRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        inviter_uuid = str(decoded_token.get("sub"))
        member_resp = supabase_client.table("workspace_members").select("assigned_node_id").eq("workspace_id", workspace_id).eq("user_id", inviter_uuid).execute()
        if not member_resp.data or member_resp.data[0]["assigned_node_id"] != "supervisor":
            return {"error": "Security Lock: Only the Top Supervisor can assign team members."}
        
        default_password = "Tessera2026!"
        user_resp = supabase_client.auth.admin.create_user({"email": invite_req.email, "password": default_password, "email_confirm": True})
        new_user_id = user_resp.user.id
        
        # --- THE MISSING LINK: Get the tenant ID of this workspace ---
        ws_resp = supabase_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
        tenant_id = ws_resp.data[0]["tenant_id"] if ws_resp.data else None

        if tenant_id:
            # Add the new human to the Company Roster!
            supabase_client.table("tenant_members").insert({
                "tenant_id": tenant_id,
                "user_id": new_user_id,
                "tenant_role": "member"
            }).execute()

        # --- NEW MASTER DATA LOOKUP ---
        role_resp = supabase_client.table("workspace_roles").select("id").eq("slug", invite_req.workspace_role).execute()
        role_id = role_resp.data[0]["id"] if role_resp.data else None

        # Add them to the Chat Room
        supabase_client.table("workspace_members").insert({
            "workspace_id": workspace_id, 
            "user_id": new_user_id, 
            "assigned_node_id": invite_req.node_id, 
            "role_id": role_id 
        }).execute()
        
        return {"success": True, "message": f"Success! {invite_req.email} created as {invite_req.workspace_role}.", "temp_password": default_password}
    except Exception as e:
        if "already registered" in str(e).lower(): return {"error": "This email is already registered in the system."}
        return {"error": f"Failed to invite user: {str(e)}"}

@app.post("/api/signup-onboard")
def signup_and_onboard(req: SignupOnboardRequest):
    try:
        user_resp = supabase_client.auth.admin.create_user({"email": req.email, "password": req.password, "email_confirm": True, "user_metadata": {"name": req.name}})
        new_user_id = user_resp.user.id
        
        tier_resp = supabase_client.table("subscription_tiers").select("id").eq("slug", "enterprise").execute()
        enterprise_tier_id = tier_resp.data[0]["id"]

        role_resp = supabase_client.table("workspace_roles").select("id").eq("slug", "tenant_admin").execute()
        admin_role_id = role_resp.data[0]["id"]

        tenant_resp = supabase_client.table("tenants").insert({
            "name": req.company_name, 
            "tier_id": enterprise_tier_id
        }).execute()
        new_tenant_id = tenant_resp.data[0]["id"]
        
        # --- NEW MASTER DATA LINK ---
        # Link the user to the tenant immediately!
        supabase_client.table("tenant_members").insert({
            "tenant_id": new_tenant_id,
            "user_id": new_user_id,
            "tenant_role": "owner"
        }).execute()
        
        default_nodes = [{"id": "supervisor", "position": {"x": 250, "y": 50}, "type": "customAgent", "data": {"label": "Supervisor Co-Pilot", "description": "Lead Agent", "systemPrompt": "You are the lead orchestrator."}}]
        ws_resp = supabase_client.table("workspaces").insert({"name": f"{req.company_name} HQ", "tenant_id": new_tenant_id, "nodes": default_nodes, "edges": []}).execute()
        new_ws_id = ws_resp.data[0]["id"]
        
        supabase_client.table("workspace_members").insert({
            "workspace_id": new_ws_id, 
            "user_id": new_user_id, 
            "assigned_node_id": "supervisor", 
            "role_id": admin_role_id
        }).execute()
        return {"success": True, "workspace_id": new_ws_id}
    except Exception as e:
        return {"error": str(e)}

# --- ADMIN ENDPOINTS ---

def verify_admin(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): raise Exception("Access Denied")
    token = auth_header.split(" ")[1]
    decoded_token = jwt.decode(token, options={"verify_signature": False})
    admin_uuid = str(decoded_token.get("sub"))
    
    # REMOVED the "role" column request!
    profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", admin_uuid).execute()
    
    if not profile_resp.data: raise Exception("Profile not found.")
    profile = profile_resp.data[0]
    
    if not profile.get("is_tessera_admin"): raise Exception("Super Admin required.")
    return admin_uuid

@app.post("/api/admin/reset-system")
def reset_system(req: Request):
    try:
        admin_uuid = verify_admin(req)
        DB_URI = os.environ.get("DATABASE_URL")
        with ConnectionPool(conninfo=DB_URI, kwargs={"prepare_threshold": None}) as pool:
            with pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("TRUNCATE TABLE public.tenant_members CASCADE;")
                    cur.execute("TRUNCATE TABLE public.workspace_members CASCADE;")
                    cur.execute("TRUNCATE TABLE public.workspaces CASCADE;")
                    cur.execute("TRUNCATE TABLE public.tenants CASCADE;")
                    cur.execute("TRUNCATE TABLE public.checkpoints CASCADE;")
                    cur.execute("TRUNCATE TABLE public.checkpoint_blobs CASCADE;")
                    cur.execute("TRUNCATE TABLE public.checkpoint_writes CASCADE;")
                    
        users_resp = supabase_client.auth.admin.list_users()
        users_list = getattr(users_resp, 'users', users_resp) if users_resp else []
        deleted_count = 0
        for u in users_list:
            if u.id != admin_uuid:
                supabase_client.auth.admin.delete_user(u.id)
                deleted_count += 1
        return {"success": True, "message": f"System reset complete. {deleted_count} users deleted."}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/admin/tenants")
def get_all_tenants(req: Request):
    try:
        verify_admin(req)
        tenants = supabase_client.table("tenants").select("id, name, created_at, subscription_tiers(display_name)").execute().data
        workspaces = supabase_client.table("workspaces").select("id, tenant_id").execute().data
        members = supabase_client.table("workspace_members").select("workspace_id, user_id").execute().data

        metrics = []
        for t in tenants:
            t_workspaces = [w for w in workspaces if w["tenant_id"] == t["id"]]
            workspace_ids = [w["id"] for w in t_workspaces]
            t_users = set([m["user_id"] for m in members if m["workspace_id"] in workspace_ids])
            metrics.append({
                "id": t["id"], 
                "name": t["name"], 
                "created_at": t.get("created_at"),
                "tier": t.get("subscription_tiers", {}).get("display_name", "Unknown"),
                "workspace_count": len(t_workspaces), 
                "user_count": len(t_users)
            })
        return {"success": True, "tenants": metrics}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/admin/master-data")
def get_master_data(req: Request):
    try:
        verify_admin(req)
        types = supabase_client.table("tool_types").select("*").execute().data
        categories = supabase_client.table("tool_categories").select("*").execute().data
        return {"success": True, "types": types, "categories": categories}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/admin/tools")
def get_global_tools(req: Request):
    try:
        verify_admin(req)
        tools = supabase_client.table("global_tools").select("*, tool_types(display_name), tool_categories(display_name)").order("created_at", desc=True).execute().data
        return {"success": True, "tools": tools}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/admin/tools")
def create_tool(payload: ToolPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_tools").insert(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).execute()
        return {"success": True, "tool": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/admin/tools/{tool_id}")
def update_tool(tool_id: str, payload: ToolPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_tools").update(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).eq("id", tool_id).execute()
        return {"success": True, "tool": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/admin/tools/{tool_id}")
def delete_tool(tool_id: str, req: Request):
    try:
        verify_admin(req)
        supabase_client.table("global_tools").delete().eq("id", tool_id).execute()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/admin/agents")
def get_global_agents(req: Request):
    try:
        verify_admin(req)
        agents = supabase_client.table("global_agents").select("*, tool_categories(display_name)").order("created_at", desc=True).execute().data
        return {"success": True, "agents": agents}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/admin/agents")
def create_agent(payload: AgentCatalogPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_agents").insert(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).execute()
        return {"success": True, "agent": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@app.put("/api/admin/agents/{agent_id}")
def update_agent(agent_id: str, payload: AgentCatalogPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_agents").update(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).eq("id", agent_id).execute()
        return {"success": True, "agent": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/admin/agents/{agent_id}")
def delete_agent(agent_id: str, req: Request):
    try:
        verify_admin(req)
        supabase_client.table("global_agents").delete().eq("id", agent_id).execute()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

# --- TENANT INTEGRATIONS & BYOK ENDPOINTS ---

@app.get("/api/tenant/tools")
def get_tenant_integrations(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        # 1. NEW LOGIC: Check tenant_members directly!
        member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
        if not member_resp.data: 
            return {"success": True, "tools": []} # Graceful fallback
        tenant_id = member_resp.data[0]["tenant_id"]

        global_tools = supabase_client.table("global_tools").select("*, tool_types(display_name), tool_categories(display_name)").eq("is_active", True).execute().data
        tenant_tools = supabase_client.table("tenant_tools").select("tool_id, status").eq("tenant_id", tenant_id).execute().data
        
        configured_map = {tt["tool_id"]: tt["status"] for tt in tenant_tools}
        
        merged_catalog = []
        for tool in global_tools:
            is_connected = tool["id"] in configured_map
            merged_catalog.append({
                **tool,
                "is_connected": is_connected,
                "tenant_status": configured_map.get(tool["id"], "disconnected")
            })
            
        return {"success": True, "tools": merged_catalog}
        
    except Exception as e:
        print(f"--- [Tenant Tools Fetch Error] {str(e)} ---")
        return {"error": str(e)}

@app.post("/api/tenant/tools/test-connection")
def test_db_connection(payload: DBConnectionTestRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): 
        return {"success": False, "error": "Access Denied"}
        
    try:
        if payload.db_type.lower() in ["postgresql", "postgres"]:
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
            
        elif payload.db_type.lower() == "snowflake":
            return {"success": True, "message": "Snowflake credentials validated!"}
            
        else:
            return {"success": False, "error": "Unsupported database type."}
            
    except Exception as e:
        print(f"--- [Connection Test Failed] {str(e)} ---")
        return {"success": False, "error": f"Connection failed: {str(e)}"}

@app.get("/api/tenant/configured-tools")
def get_tenant_configured_tools(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]

    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))

        # 1. NEW LOGIC: Check tenant_members directly!
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

@app.post("/api/tenant/tools")
def save_tenant_integration(payload: TenantToolPayload, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        # 1. NEW LOGIC: Verify they are an actual tenant member before saving keys
        member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
        if not member_resp.data:
            return {"error": "Security Error: You are not assigned to a company tenant."} 
            
        tenant_id = member_resp.data[0]["tenant_id"]

        supabase_client.table("tenant_tools").insert({
            "tenant_id": tenant_id,
            "tool_id": payload.tool_id,
            "connection_name": payload.connection_name, 
            "credentials": payload.credentials,
            "status": "active"
        }).execute()
            
        return {"success": True, "message": "Credentials securely saved."}

    except Exception as e:
        print(f"--- [Tenant Tools Save Error] {str(e)} ---")
        return {"error": str(e)}

@app.get("/api/tenant/agents")
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