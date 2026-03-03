from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import jwt
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

from config_db import get_system_setting
from crypto import decrypt_credentials
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

class TelemetryEvent(BaseModel):
    url: str
    action_type: str
    target_element: Optional[str] = None
    context_data: Optional[str] = None
    timestamp: str 

class TelemetryBatchRequest(BaseModel):
    events: List[TelemetryEvent]

@router.post("/ingest")
def ingest_telemetry_events(payload: TelemetryBatchRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Access Denied")
    
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error: {str(e)}")

    try:
        # Get the tenant ID for this user
        member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
        if not member_resp.data:
            raise HTTPException(status_code=403, detail="User is not associated with any tenant")
        
        tenant_id = member_resp.data[0]["tenant_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    try:
        # Prepare batch for insertion
        events_to_insert = []
        for event in payload.events:
            events_to_insert.append({
                "tenant_id": tenant_id,
                "url": event.url,
                "action_type": event.action_type,
                "target_element": event.target_element,
                "context_data": event.context_data,
                "timestamp": event.timestamp
            })
        
        if events_to_insert:
            supabase_client.table("telemetry_events").insert(events_to_insert).execute()
            
        return {"status": "success", "inserted": len(events_to_insert)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest telemetry events: {str(e)}")

class SynthesizeRequest(BaseModel):
    time_range: str = "last_24h" # or "last_7d"

class ReactFlowNode(BaseModel):
    id: str
    type: str = Field(description="Must be one of: 'triggerNode', 'customAgent', 'startNode', 'endNode', 'approvalNode'")
    position: Dict[str, float] = Field(description="A dict with x and y coordinates")
    data: Dict[str, Any] = Field(description="The data payload. MUST include 'label', 'description', and 'tools' (a list of tool objects with 'id', 'name'). For customAgent, it's just 'customAgent'.")

class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str

class SynthesisResult(BaseModel):
    pattern_found: bool = Field(description="True if a clear repetitive workflow pattern was identified in the logs.")
    name: Optional[str] = Field(description="Suggested name for the automation workspace.")
    description: Optional[str] = Field(description="What this automation does.")
    nodes: Optional[List[ReactFlowNode]] = Field(description="List of React Flow nodes to create.")
    edges: Optional[List[ReactFlowEdge]] = Field(description="List of React Flow edges connecting the nodes.")

def get_llm_for_tenant(tenant_id: str):
    # Fetch active LLM tools
    tool_resp = supabase_client.table("tenant_tools").select("credentials, tool_id").eq("tenant_id", tenant_id).eq("status", "active").execute()
    if not tool_resp.data:
        return None
        
    tool_ids = [t["tool_id"] for t in tool_resp.data]
    if not tool_ids:
        return None
        
    global_tools_resp = supabase_client.table("global_tools").select("id, tool_types!inner(slug)").in_("id", tool_ids).execute()
    # Filter where the joined tool_type has the slug 'llm'
    llm_global_tool_ids = {g["id"] for g in global_tools_resp.data if g.get("tool_types", {}).get("slug") == "llm"}
    
    llm_tool = None
    for t in tool_resp.data:
        if t["tool_id"] in llm_global_tool_ids:
            llm_tool = t
            break

    if not llm_tool:
        return None
        
    try:
        credentials = decrypt_credentials(llm_tool["credentials"])
    except Exception:
        return None

    provider = credentials.get("provider", "").lower()
    api_key = credentials.get("api_key", "")
    model_name = credentials.get("model_name")
    
    if not api_key or not model_name: 
        return None

    if provider == "openai":
        return ChatOpenAI(model=model_name, api_key=api_key, temperature=0.1)
    elif provider == "anthropic":
        return ChatAnthropic(model=model_name, api_key=api_key, temperature=0.1)
    elif provider == "groq":
        return ChatGroq(model=model_name, api_key=api_key, temperature=0.1)
    elif provider == "google gemini":
        return ChatGoogleGenerativeAI(model=model_name, api_key=api_key, temperature=0.1, safety_settings={HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE})
    
    return None

@router.post("/synthesize")
def synthesize_telemetry(payload: SynthesizeRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Access Denied")
    
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
        if not member_resp.data:
            raise HTTPException(status_code=403, detail="User is not associated with any tenant")
        tenant_id = member_resp.data[0]["tenant_id"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")

    # Prerequisite Check (BYOK)
    llm = get_llm_for_tenant(tenant_id)
    if not llm:
        raise HTTPException(status_code=400, detail="missing_llm_key")

    try:
        # Time threshold
        now = datetime.now(timezone.utc)
        if payload.time_range == "last_7d":
            threshold = now - timedelta(days=7)
        else:
            threshold = now - timedelta(hours=24)

        # 1. Fetch telemetry logs
        logs_resp = supabase_client.table("telemetry_events")\
            .select("action_type, target_element, url, context_data")\
            .eq("tenant_id", tenant_id)\
            .gte("timestamp", threshold.isoformat())\
            .order("timestamp", desc=False)\
            .limit(1000)\
            .execute()
        
        telemetry_data = logs_resp.data
        if len(telemetry_data) < 5:
            # Not enough data
            return {"pattern_found": False}

        # 2. Fetch global agents
        agents_resp = supabase_client.table("global_agents").select("id, name, description").eq("is_active", True).execute()
        tools_resp = supabase_client.table("global_tools").select("id, name, description").eq("is_active", True).execute()

        agents_context = str([{"id": a["id"], "name": a["name"], "description": a["description"]} for a in agents_resp.data])
        tools_context = str([{"id": t["id"], "name": t["name"], "description": t["description"]} for t in tools_resp.data])

        # Convert logs to string
        logs_str = ""
        for i, l in enumerate(telemetry_data):
            logs_str += f"[{i}] {l['action_type']} on '{l.get('target_element','')}' at {l.get('url','')}. Data: {l.get('context_data','')}\n"

        default_prompt = (
            "You are an expert business process analyst and workflow designer.\n"
            "You will receive a sequence of user UI interactions (clicks, copy/pastes).\n"
            "Your job is to identify a repetitive task and construct an automated agent workflow using ONLY the available agents and tools provided below.\n\n"
            "Available Agents: {agents_context}\n"
            "Available Tools: {tools_context}\n\n"
            "If you find a pattern, generate a React Flow JSON structure.\n"
            "Node types must be 'customAgent' (for agents) or 'triggerNode' (as the start of the flow).\n"
            "DO NOT create standalone tool nodes. Instead, if an agent needs a tool, add that tool object (with its 'id' and 'name' from the catalog) into the 'tools' array inside the customAgent's data payload.\n"
            "The data payload MUST include 'label' and 'description' based on the catalog.\n"
            "Position nodes linearly using an x/y coordinate system (e.g. x:250, y: spacing of 150).\n"
        )
        system_instructions = get_system_setting("telemetry_synthesis_prompt", default_prompt)

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_instructions),
            ("human", "Here are the web interactions from the user:\n\n{logs}")
        ])

        structured_llm = llm.with_structured_output(SynthesisResult)
        chain = prompt | structured_llm

        print(f"--- [Process Discovery] Invoking LLM for tenant {tenant_id} over {len(telemetry_data)} logs ---")
        result: SynthesisResult = chain.invoke({
            "agents_context": agents_context,
            "tools_context": tools_context,
            "logs": logs_str[:15000] # Cap prompt size to prevent token explosion
        })

        if result.pattern_found and result.nodes:
            # Save exactly as React Flow needs
            nodes_json = []
            for n in result.nodes:
                n_dict = n.dict()
                if n_dict.get("type") not in ["triggerNode", "approvalNode", "conditionalNode", "startNode", "endNode"]:
                    n_dict["type"] = "customAgent"
                
                # Ensure data shape matches frontend expectations precisely
                if "data" not in n_dict or not isinstance(n_dict["data"], dict):
                    n_dict["data"] = {"label": "AI Node", "description": "", "tools": []}
                else:
                    d = n_dict["data"]
                    if "description" not in d: d["description"] = "Generated Autonomous Agent"
                    if "tools" not in d: d["tools"] = []
                    
                    # If LLM put agent_id or tool_id mapping natively into payload rather than the tools array, standardize it
                    if "tool_id" in d and isinstance(d["tool_id"], str) and len(d["tools"]) == 0:
                         d["tools"].append({"id": d["tool_id"], "name": d.get("label", "Tool")})
                         del d["tool_id"]
                         
                nodes_json.append(n_dict)

            edges_json = [e.dict() for e in (result.edges or [])]

            ws_name = result.name or "Auto-Generated Workspace"
            
            # Insert draft workspace
            insert_resp = supabase_client.table("workspaces").insert({
                "tenant_id": tenant_id,
                "name": ws_name,
                "nodes": nodes_json,
                "edges": edges_json,
                "status": "draft"
            }).execute()

            draft_id = insert_resp.data[0]["id"] if insert_resp.data else None

            if draft_id:
                supabase_client.table("workspace_members").insert({
                    "workspace_id": draft_id,
                    "user_id": user_uuid,
                    "assigned_node_id": nodes_json[0]["id"] if nodes_json else "supervisor",
                    "role_id": None
                }).execute()

            return {
                "pattern_found": True,
                "workspace_id": draft_id,
                "name": ws_name,
                "description": result.description
            }
        else:
            return {"pattern_found": False}

    except Exception as e:
        print(f"--- [Synthesis Error] {str(e)} ---")
        raise HTTPException(status_code=500, detail=str(e))

