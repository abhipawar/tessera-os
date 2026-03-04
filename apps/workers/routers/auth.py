from fastapi import APIRouter
from pydantic import BaseModel
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api", tags=["auth"])

class SignupOnboardRequest(BaseModel):
    email: str
    password: str
    name: str
    company_name: str
    otp_code: str

@router.post("/signup-onboard")
def signup_and_onboard(req: SignupOnboardRequest):
    try:
        # 1. Validate the OTP First
        otp_resp = supabase_client.table("otp_verifications").select("expires_at").eq("email", req.email).eq("code", req.otp_code).execute()
        if not otp_resp.data:
            return {"error": "Invalid verification code."}
            
        import datetime
        expires_at = datetime.datetime.fromisoformat(otp_resp.data[0]["expires_at"].replace('Z', '+00:00'))
        if datetime.datetime.now(datetime.timezone.utc) > expires_at:
            return {"error": "Verification code has expired."}

        # OTP is valid, proceed with creating the architecture
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
