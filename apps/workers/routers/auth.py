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

class SendOtpRequest(BaseModel):
    email: str

@router.post("/send-otp")
def send_otp(req: SendOtpRequest):
    import random
    import datetime
    import requests
    try:
        if not req.email or "@" not in req.email:
            return {"error": "Invalid email address."}
            
        code = str(random.randint(100000, 999999))
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)
        
        supabase_client.table("otp_verifications").delete().eq("email", req.email).execute()
        supabase_client.table("otp_verifications").insert({
            "email": req.email,
            "code": code,
            "expires_at": expires_at.isoformat()
        }).execute()
        
        resend_key = os.environ.get("RESEND_API_KEY")
        if not resend_key:
            print(f"\n==========================================")
            print(f"📧 [MOCK EMAIL] To: {req.email}")
            print(f"🔑 [OTP CODE]: {code}")
            print(f"==========================================\n")
            return {"success": True, "message": "Code sent successfully (Mocked in Local Dev)."}
            
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; padding: 40px; border-radius: 12px; border: 1px solid #27272a;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Verify your Email</h1>
            </div>
            <div style="background-color: #18181b; padding: 32px; border-radius: 8px; border: 1px solid #27272a;">
                <p style="color: #a1a1aa; font-size: 16px; margin-top: 0;">Hello,</p>
                <p style="color: #a1a1aa; font-size: 16px;">Please use the following verification code to complete your signup process for Tessera OS.</p>
                
                <div style="background-color: #09090b; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0; border: 1px solid #3f3f46;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #10b981;">{code}</span>
                </div>
                
                <p style="color: #71717a; font-size: 14px; margin-bottom: 0;">This code will expire in 15 minutes.</p>
            </div>
        </div>
        """
        
        res = requests.post("https://api.resend.com/emails", json={
            "from": "Tessera OS Security <security@tesseraos.ai>",
            "to": req.email,
            "subject": "Your Tessera OS Verification Code",
            "html": html_content
        }, headers={"Authorization": f"Bearer {resend_key}"})
        
        if not res.ok:
            return {"error": "Failed to dispatch email provider."}
            
        return {"success": True}
    except Exception as e:
        print(f"OTP Generation Error: {e}")
        return {"error": str(e)}

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
