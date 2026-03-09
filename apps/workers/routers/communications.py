from fastapi import APIRouter, Request
import os
import jwt
from supabase import create_client

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api/tenant", tags=["communications"])

@router.get("/communications")
def get_tenant_communications(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): 
        return {"success": False, "error": "Access Denied"}
    
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        # Super admin check
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_superadmin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        
        tenant_id = None
        if is_superadmin and impersonated_tenant_id:
            tenant_id = impersonated_tenant_id
        else:
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data:
                if is_superadmin:
                    # Superadmin viewing root context
                     logs = supabase_client.table("agent_communications").select("*, workspaces(name)").order("created_at", desc=True).limit(50).execute().data
                     return {"success": True, "logs": logs}
                return {"success": True, "logs": []}
            
            tenant_id = member_resp.data[0]["tenant_id"]
            
        # Fetch workspaces for tenant
        ws_resp = supabase_client.table("workspaces").select("id, name").eq("tenant_id", tenant_id).execute()
        if not ws_resp.data:
            return {"success": True, "logs": []}
            
        workspace_ids = [w["id"] for w in ws_resp.data]
        
        # Fetch logs
        logs = supabase_client.table("agent_communications").select("*, workspaces(name)").in_("workspace_id", workspace_ids).order("created_at", desc=True).limit(50).execute().data
            
        return {"success": True, "logs": logs}
        
    except Exception as e:
        print(f"--- [Communications Fetch Error] {str(e)} ---")
        return {"success": False, "error": str(e)}

@router.get("/agent-tasks")
def get_tenant_agent_tasks(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): 
        return {"success": False, "error": "Access Denied"}
    
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_superadmin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        
        tenant_id = None
        if is_superadmin and impersonated_tenant_id:
            tenant_id = impersonated_tenant_id
        else:
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data:
                if is_superadmin:
                    tasks = supabase_client.table("agent_tasks").select("*, workspaces(name)").eq("status", "pending_approval").order("created_at", desc=True).execute().data
                    return {"success": True, "tasks": tasks}
                return {"success": True, "tasks": []}
            
            tenant_id = member_resp.data[0]["tenant_id"]
            
        ws_resp = supabase_client.table("workspaces").select("id, name").eq("tenant_id", tenant_id).execute()
        if not ws_resp.data:
            return {"success": True, "tasks": []}
            
        workspace_ids = [w["id"] for w in ws_resp.data]
        
        tasks_resp = supabase_client.table("agent_tasks").select("*, workspaces(name)").in_("workspace_id", workspace_ids).eq("status", "pending_approval").order("created_at", desc=True).execute()
            
        return {"success": True, "tasks": tasks_resp.data or []}
        
    except Exception as e:
        print(f"--- [Agent Tasks Fetch Error] {str(e)} ---")
        return {"success": False, "error": str(e)}
        


from pydantic import BaseModel

class EmailRoutePayload(BaseModel):
    prefix: str

@router.get("/workspaces/{workspace_id}/email-route")
def get_email_route(workspace_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"success": False, "error": "Access Denied"}
    
    try:
        resp = supabase_client.table("inbound_email_routes").select("semantic_email_prefix").eq("workspace_id", workspace_id).execute()
        if not resp.data:
            return {"success": True, "prefix": None}
        return {"success": True, "prefix": resp.data[0]["semantic_email_prefix"]}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/workspaces/{workspace_id}/email-route")
def update_email_route(workspace_id: str, payload: EmailRoutePayload, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"success": False, "error": "Access Denied"}
    
    try:
        resp = supabase_client.table("inbound_email_routes").select("id").eq("workspace_id", workspace_id).execute()
        safe_prefix = payload.prefix.strip().lower().replace(" ", "-").replace("@", "")
        
        if not resp.data:
            ws_resp = supabase_client.table("workspaces").select("nodes").eq("id", workspace_id).execute()
            nodes = ws_resp.data[0].get("nodes", []) if ws_resp.data else []
            import json
            if isinstance(nodes, str): nodes = json.loads(nodes)
            
            node_id = 'supervisor'
            if len(nodes) > 0:
                node_id = nodes[0].get('id', 'supervisor')
                
            supabase_client.table("inbound_email_routes").insert({
                "workspace_id": workspace_id,
                "node_id": node_id,
                "semantic_email_prefix": safe_prefix
            }).execute()
        else:
            supabase_client.table("inbound_email_routes").update({
                "semantic_email_prefix": safe_prefix
            }).eq("workspace_id", workspace_id).execute()
        
        return {"success": True, "prefix": safe_prefix}
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            return {"success": False, "error": "This email prefix is already taken by another workspace."}
        return {"success": False, "error": str(e)}
