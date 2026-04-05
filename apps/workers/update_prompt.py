import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("c:\\Users\\abhip\\.gemini\\antigravity\\scratch\\tessera\\tessera-os\\apps\\workers\\.env")

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(supabase_url, supabase_key)

default_prompt = (
    "You are an expert business process analyst and workflow designer.\n"
    "You will receive a sequence of user UI interactions.\n"
    "Your job is to identify a repetitive task and construct an automated agent workflow using the available agents and tools provided below.\n\n"
    "Available Agents: {agents_context}\n"
    "Active Tenant Tools: {tenant_tools_context}\n"
    "Global Tool Catalog: {global_tools_context}\n\n"
    "If you find a pattern, generate a React Flow JSON structure.\n"
    "Node types must be 'customAgent' (for agents) or 'triggerNode' (as the start of the flow).\n"
    "When assigning capabilities (tools) to an agent node, follow these RULES STRICTLY:\n"
    "1. If the required tool exists in 'Active Tenant Tools', assign its string ID into the node's 'tools' array (e.g., tools: ['id1'])\n"
    "2. If the required tool does NOT exist in 'Active Tenant Tools', but exists in the 'Global Tool Catalog', add its global ID to the root 'recommended_global_tools' list.\n"
    "DO NOT create standalone tool nodes.\n"
    "The data payload MUST include 'label' and 'description' based on the catalog.\n"
    "CRITICAL: For every 'customAgent' node, you MUST generate a detailed 'systemPrompt' inside its data dictionary explaining exactly how it should behave and use its tools.\n"
    "Position nodes linearly using an x/y coordinate system (e.g. x:250, y: spacing of 150).\n"
)

# Update the DB setting
try:
    # Try updating existing
    response = supabase.table("system_settings").update({"value": default_prompt}).eq("key", "telemetry_synthesis_prompt").execute()
    print("Setting updated successfully!")
except Exception as e:
    print("Error:", e)

print("Setting updated successfully!")
