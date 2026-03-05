from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
supabase_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

# Grab the first workspace in the DB
ws_resp = supabase_client.table("workspaces").select("id, nodes").limit(1).execute()
workspace_id = ws_resp.data[0]["id"]
print(workspace_id)

import json
nodes = json.loads(ws_resp.data[0]["nodes"])
try:
    node_id = next(n["id"] for n in nodes if n["type"] == "supervisor")
except StopIteration:
    try:
        node_id = next(n["id"] for n in nodes if n["type"] == "worker")
    except StopIteration:
        node_id = nodes[0]["id"]

# Insert the mock route
route_resp = supabase_client.table("inbound_email_routes").insert({
    "workspace_id": workspace_id,
    "node_id": node_id,
    "semantic_email_prefix": "supervisor",
    "is_active": True
}).execute()

print(f"Successfully mapped 'supervisor@agents.tesseraos.ai' to Workspace: {workspace_id} -> Node: {node_id}")
