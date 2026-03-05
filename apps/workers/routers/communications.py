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
        is_superadmin = False
        if profile_resp.data and profile_resp.data[0].get("is_tessera_admin"):
            is_superadmin = True
            
        if is_superadmin:
             # Superadmin can see all logs
             logs = supabase_client.table("agent_communications").select("*, workspaces(name)").order("created_at", desc=True).limit(50).execute().data
        else:
            # Fetch tenant id
            member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
            if not member_resp.data: 
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
