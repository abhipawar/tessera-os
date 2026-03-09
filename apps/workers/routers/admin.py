from fastapi import APIRouter, Request
from pydantic import BaseModel
import os
import jwt
from psycopg_pool import ConnectionPool
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api/admin", tags=["admin"])

class ToolPayload(BaseModel):
    name: str
    description: str
    type_id: str
    category_id: str
    logo_icon: str
    config_schema: dict
    is_active: bool

class AgentCatalogPayload(BaseModel):
    name: str
    description: str
    system_prompt: str
    category_id: str
    logo_icon: str
    is_active: bool

class SystemSettingPayload(BaseModel):
    key: str
    value: str

def verify_admin(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): raise Exception("Access Denied")
    token = auth_header.split(" ")[1]
    decoded_token = jwt.decode(token, options={"verify_signature": False})
    admin_uuid = str(decoded_token.get("sub"))
    
    profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", admin_uuid).execute()
    if not profile_resp.data: raise Exception("Profile not found.")
    
    if not profile_resp.data[0].get("is_tessera_admin"): raise Exception("Super Admin required.")
    return admin_uuid

@router.post("/reset-system")
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

@router.get("/tenants")
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

@router.delete("/tenants/{tenant_id}")
def delete_tenant(tenant_id: str, req: Request):
    try:
        admin_uuid = verify_admin(req)
        
        # 1. Find all users associated with this tenant
        t_members_resp = supabase_client.table("tenant_members").select("user_id").eq("tenant_id", tenant_id).execute()
        users_to_check = set([m["user_id"] for m in t_members_resp.data])
        
        # 2. Check if these users belong to any OTHER tenant
        users_to_delete = []
        for uid in users_to_check:
            other_tenants = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", uid).neq("tenant_id", tenant_id).execute()
            if not other_tenants.data:
                users_to_delete.append(uid)
                
        # 3. Delete tenant from database (cascade handles related records)
        # Note: tenant_members will be deleted by ON DELETE CASCADE
        supabase_client.table("tenants").delete().eq("id", tenant_id).execute()
        
        # 4. Delete orphaned auth users
        deleted_auth_count = 0
        for uid in users_to_delete:
            if str(uid) != str(admin_uuid): # Never delete the executing superadmin
                supabase_client.auth.admin.delete_user(uid)
                deleted_auth_count += 1
                
        return {"success": True, "message": f"Tenant deleted. {deleted_auth_count} orphaned users removed."}
    except Exception as e:
        return {"error": str(e)}

@router.get("/master-data")
def get_master_data(req: Request):
    try:
        verify_admin(req)
        types = supabase_client.table("tool_types").select("*").execute().data
        categories = supabase_client.table("tool_categories").select("*").execute().data
        return {"success": True, "types": types, "categories": categories}
    except Exception as e:
        return {"error": str(e)}

@router.get("/tools")
def get_global_tools(req: Request):
    try:
        verify_admin(req)
        tools = supabase_client.table("global_tools").select("*, tool_types(display_name), tool_categories(display_name)").order("created_at", desc=True).execute().data
        return {"success": True, "tools": tools}
    except Exception as e:
        return {"error": str(e)}

@router.post("/tools")
def create_tool(payload: ToolPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_tools").insert(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).execute()
        return {"success": True, "tool": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@router.put("/tools/{tool_id}")
def update_tool(tool_id: str, payload: ToolPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_tools").update(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).eq("id", tool_id).execute()
        return {"success": True, "tool": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@router.delete("/tools/{tool_id}")
def delete_tool(tool_id: str, req: Request):
    try:
        verify_admin(req)
        supabase_client.table("global_tools").delete().eq("id", tool_id).execute()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

@router.get("/agents")
def get_global_agents(req: Request):
    try:
        verify_admin(req)
        agents = supabase_client.table("global_agents").select("*, tool_categories(display_name)").order("created_at", desc=True).execute().data
        return {"success": True, "agents": agents}
    except Exception as e:
        return {"error": str(e)}

@router.post("/agents")
def create_agent(payload: AgentCatalogPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_agents").insert(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).execute()
        return {"success": True, "agent": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@router.put("/agents/{agent_id}")
def update_agent(agent_id: str, payload: AgentCatalogPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("global_agents").update(payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict()).eq("id", agent_id).execute()
        return {"success": True, "agent": res.data[0]}
    except Exception as e:
        return {"error": str(e)}

@router.delete("/agents/{agent_id}")
def delete_agent(agent_id: str, req: Request):
    try:
        verify_admin(req)
        supabase_client.table("global_agents").delete().eq("id", agent_id).execute()
        return {"success": True}
    except Exception as e:
        return {"error": str(e)}

@router.get("/system-settings")
def get_system_settings(req: Request):
    try:
        verify_admin(req)
        settings = supabase_client.table("system_settings").select("*").order("key").execute().data
        return {"success": True, "settings": settings}
    except Exception as e:
        return {"error": str(e)}

@router.put("/system-settings")
def update_system_setting(payload: SystemSettingPayload, req: Request):
    try:
        verify_admin(req)
        res = supabase_client.table("system_settings").update({"value": payload.value}).eq("key", payload.key).execute()
        
        from config_db import _settings_cache
        if payload.key in _settings_cache:
            _settings_cache[payload.key] = payload.value
            
        return {"success": True, "setting": res.data[0] if res.data else None}
    except Exception as e:
        return {"error": str(e)}
