import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(url, key)

def seed_tessera_tenant():
    EMAIL = "abhi@tessera.ai"
    COMPANY_NAME = "Tessera OS"
    
    print(f"Looking up user: {EMAIL}")
    users = supabase.auth.admin.list_users()
    admin_id = next((u.id for u in users if u.email == EMAIL), None)
    
    if not admin_id:
        print(f"User {EMAIL} not found in auth.users! Aborting.")
        return
        
    print(f"Found user ID: {admin_id}")
    
    # 1. Check if user already in a tenant
    existing_member = supabase.table("tenant_members").select("tenant_id").eq("user_id", admin_id).execute()
    if existing_member.data:
        print(f"User is already in tenant: {existing_member.data[0]['tenant_id']}")
        return

    print("Fetching enterprise subscription tier...")
    tier_resp = supabase.table("subscription_tiers").select("id").eq("slug", "enterprise").execute()
    enterprise_tier_id = tier_resp.data[0]["id"]

    print("Fetching tenant_admin role...")
    role_resp = supabase.table("workspace_roles").select("id").eq("slug", "tenant_admin").execute()
    admin_role_id = role_resp.data[0]["id"]
    
    print(f"Creating tenant: {COMPANY_NAME}...")
    tenant_resp = supabase.table("tenants").insert({
        "name": COMPANY_NAME, 
        "tier_id": enterprise_tier_id
    }).execute()
    new_tenant_id = tenant_resp.data[0]["id"]
    print(f"Created Tenant ID: {new_tenant_id}")
    
    print("Mapping user to tenant as owner...")
    supabase.table("tenant_members").insert({
        "tenant_id": new_tenant_id,
        "user_id": admin_id,
        "tenant_role": "owner"
    }).execute()
    
    print("Initializing default workspace...")
    default_nodes = [{"id": "supervisor", "position": {"x": 250, "y": 50}, "type": "customAgent", "data": {"label": "Supervisor Co-Pilot", "description": "Lead Agent", "systemPrompt": "You are the lead orchestrator."}}]
    ws_resp = supabase.table("workspaces").insert({
        "name": f"{COMPANY_NAME} HQ", 
        "tenant_id": new_tenant_id, 
        "nodes": default_nodes, 
        "edges": []
    }).execute()
    new_ws_id = ws_resp.data[0]["id"]
    print(f"Created Workspace ID: {new_ws_id}")
    
    print("Mapping user to workspace...")
    supabase.table("workspace_members").insert({
        "workspace_id": new_ws_id, 
        "user_id": admin_id, 
        "assigned_node_id": "supervisor", 
        "role_id": admin_role_id
    }).execute()
    
    print("\n✅ Success! User is now the owner of the Tessera OS tenant.")

if __name__ == "__main__":
    seed_tessera_tenant()
