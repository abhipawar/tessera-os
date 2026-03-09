from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import jwt
import json
from typing import Optional
from langgraph.checkpoint.postgres import PostgresSaver
import psycopg
from graphs.builder import build_dynamic_graph
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from supabase import create_client, Client
from dotenv import load_dotenv
from config_db import get_system_setting

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api", tags=["chat"])

class AgentRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None  
    chat_id: Optional[str] = None

class ChatCreateRequest(BaseModel):
    workspace_id: str

class ChatUpdateRequest(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

class ChatCreateRequest(BaseModel):
    workspace_id: str

class ChatUpdateRequest(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

class InviteRequest(BaseModel):
    email: str
    node_id: str
    workspace_role: str = "member"

@router.get("/tenant-agent/chats/{workspace_id}")
def get_workspace_chats(workspace_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"chats": [], "error": "Access Denied"}
    token = auth_header.split(" ")[1]
    decoded_token = jwt.decode(token, options={"verify_signature": False})
    user_uuid = str(decoded_token.get("sub"))
    try:
        resp = supabase_client.table("chats").select("*").eq("workspace_id", workspace_id).eq("user_id", user_uuid).order("is_pinned", desc=True).order("created_at", desc=True).execute()
        return {"chats": resp.data}
    except Exception as e:
        return {"chats": [], "error": str(e)}

@router.post("/tenant-agent/chats")
def create_chat(payload: ChatCreateRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"chat": None, "error": "Access Denied"}
    token = auth_header.split(" ")[1]
    decoded_token = jwt.decode(token, options={"verify_signature": False})
    user_uuid = str(decoded_token.get("sub"))
    try:
        resp = supabase_client.table("chats").insert({
            "workspace_id": payload.workspace_id,
            "user_id": user_uuid,
            "title": "New Chat",
            "is_pinned": False
        }).execute()
        return {"chat": resp.data[0] if resp.data else None}
    except Exception as e:
        return {"chat": None, "error": str(e)}

@router.patch("/tenant-agent/chats/{chat_id}")
def update_chat(chat_id: str, payload: ChatUpdateRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"chat": None, "error": "Access Denied"}
    token = auth_header.split(" ")[1]
    decoded_token = jwt.decode(token, options={"verify_signature": False})
    user_uuid = str(decoded_token.get("sub"))
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data: return {"status": "ok"}
    try:
        resp = supabase_client.table("chats").update(update_data).eq("id", chat_id).eq("user_id", user_uuid).execute()
        return {"chat": resp.data[0] if resp.data else None}
    except Exception as e:
        return {"chat": None, "error": str(e)}

@router.delete("/tenant-agent/chats/{chat_id}")
def delete_chat(chat_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"status": "error", "error": "Access Denied"}
    token = auth_header.split(" ")[1]
    decoded_token = jwt.decode(token, options={"verify_signature": False})
    user_uuid = str(decoded_token.get("sub"))
    try:
        supabase_client.table("chats").delete().eq("id", chat_id).eq("user_id", user_uuid).execute()
        DB_URI = os.environ.get("DATABASE_URL")
        try:
            with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM checkpoints WHERE thread_id = %s", (chat_id,))
                    cur.execute("DELETE FROM checkpoint_blobs WHERE thread_id = %s", (chat_id,))
                    cur.execute("DELETE FROM checkpoint_writes WHERE thread_id = %s", (chat_id,))
                conn.commit()
        except: pass
        return {"status": "deleted"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/tenant-agent/history/{chat_id}")
def get_chat_history(chat_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"messages": [], "error": "Access Denied: No valid authentication token provided."}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        if not user_uuid: return {"messages": [], "error": "Invalid token."}
        config = {"configurable": {"thread_id": chat_id}}
    except Exception as e:
        return {"messages": [], "error": f"Token error: {str(e)}"}
        
    try:
        chat_resp = supabase_client.table("chats").select("workspace_id").eq("id", chat_id).eq("user_id", user_uuid).execute()
        if not chat_resp.data: return {"messages": [], "error": "Chat not found or access denied."}
        workspace_id = chat_resp.data[0]["workspace_id"]
        
        member_resp = supabase_client.table("workspace_members").select("assigned_node_id").eq("workspace_id", workspace_id).eq("user_id", user_uuid).execute()
        if not member_resp.data: return {"messages": [], "error": "Access Denied"}
        user_node_id = member_resp.data[0]["assigned_node_id"]
    except Exception as e:
        return {"messages": [], "error": f"Database Error: {str(e)}"}

    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data: return {"messages": [], "error": "Workspace not found."}
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
        
        node_ids = set([n.get("id") for n in nodes])
        if user_node_id not in node_ids and nodes:
            # Check if this is a complex multi-agent graph
            agent_nodes = [n for n in nodes if n.get("type") not in ["startNode", "endNode", "triggerNode", "conditionalNode"]]
            if len(agent_nodes) > 1:
                return {"result": [{"name": "System Orchestrator", "content": "I'm sorry, this workspace has multiple agents but is missing a 'Supervisor Co-Pilot' node. Please return to the Studio and add a Supervisor so I know how to route your instructions!"}]}
            # Otherwise, graceful fallback for single agent test graphs
            user_node_id = nodes[0].get("id")
    except Exception as e:
        return {"messages": [], "error": f"Error loading chat: {str(e)}"}
        
    DB_URI = os.environ.get("DATABASE_URL")
    try:
        with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
            memory = PostgresSaver(conn)
            memory.setup() 
            state_tuple = memory.get_tuple(config)
            all_messages = state_tuple.checkpoint["channel_values"].get("messages", []) if state_tuple else []
            chat_history = []
            import re
            
            node_id_to_label = {n.get("id"): n.get("data", {}).get("label", "Unknown") for n in nodes}
            user_node_label = node_id_to_label.get(user_node_id, "Unknown")
            user_safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', user_node_label)

            for msg in all_messages:
                if isinstance(msg, HumanMessage):
                    chat_history.append({"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    if msg.name == user_safe_name:
                        clean_content = re.sub(r"^\*\*\[.*?\]\*\*:\s*", "", msg.content).strip()
                        chat_history.append({"role": "assistant", "content": clean_content, "name": msg.name})
            return {"messages": chat_history}
    except Exception as e:
        return {"messages": [], "error": f"Execution error: {str(e)}"}

@router.post("/tenant-agent")
def run_tenant_agent(request: AgentRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"result": "Access Denied"}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        config = {"configurable": {"thread_id": request.chat_id}}
        
        # Check if user is a superadmin
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
    except Exception as e:
        return {"result": f"Token error: {str(e)}"}
    if not request.chat_id: return {"result": "No chat ID provided."}
        
    try:
        chat_resp = supabase_client.table("chats").select("workspace_id").eq("id", request.chat_id).eq("user_id", user_uuid).execute()
        if not chat_resp.data: return {"result": "Chat not found or access denied."}
        workspace_id = chat_resp.data[0]["workspace_id"]
        
        user_node_id = None
        if not is_admin:
            member_resp = supabase_client.table("workspace_members").select("assigned_node_id").eq("workspace_id", workspace_id).eq("user_id", user_uuid).execute()
            if not member_resp.data: return {"result": "Access Denied"}
            user_node_id = member_resp.data[0]["assigned_node_id"]
    except Exception as e:
        return {"result": f"RBAC Error: {str(e)}"}
        
    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data: return {"result": "Workspace not found."}
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
        
        node_ids = set([n.get("id") for n in nodes])
        if user_node_id not in node_ids and nodes:
            # Check if this is a complex multi-agent graph
            agent_nodes = [n for n in nodes if n.get("type") not in ["startNode", "endNode", "triggerNode", "conditionalNode"]]
            if len(agent_nodes) > 1:
                return {"result": [{"name": "System Orchestrator", "content": "I'm sorry, this workspace has multiple agents but is missing a 'Supervisor Co-Pilot' node. Please return to the Studio and add a Supervisor so I know how to route your instructions!"}]}
            # Otherwise, graceful fallback for single agent test graphs
            user_node_id = nodes[0].get("id")
    except Exception as e:
        return {"result": f"Error loading chat: {str(e)}"}
            
    DB_URI = os.environ.get("DATABASE_URL")
    try:
        with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
            memory = PostgresSaver(conn)
            memory.setup() 
            compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=user_node_id, memory=memory, workspace_id=workspace_id)
            current_state = compiled_graph.get_state(config)
            existing_msg_count = len(current_state.values.get("messages", [])) if current_state.values else 0
            
            initial_state = {
                "messages": [HumanMessage(content=request.query)],
                "context_variables": {"user": {"query": request.query}}
            }
            
            final_state = compiled_graph.invoke(initial_state, config=config)
            all_messages = final_state.get("messages", [])
            new_messages = all_messages[existing_msg_count + 1:] 
            import re
            
            node_id_to_label = {n.get("id"): n.get("data", {}).get("label", "Unknown") for n in nodes}
            user_node_label = node_id_to_label.get(user_node_id, "Unknown")
            user_safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', user_node_label)
            
            results = []
            for msg in new_messages:
                if isinstance(msg, AIMessage):
                    if msg.name == user_safe_name:
                        clean_content = re.sub(r"^\*\*\[.*?\]\*\*:\s*", "", msg.content).strip()
                        results.append({"name": msg.name, "content": clean_content})
            return {"result": results}
    except Exception as e:
        return {"result": f"Execution error: {str(e)}"}

@router.post("/tenant-agent/stream")
def run_tenant_agent_stream(request: AgentRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"result": "Access Denied"}
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        config = {"configurable": {"thread_id": request.chat_id}}
        
        # Check if user is a superadmin
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
    except Exception as e:
        return {"result": f"Token error: {str(e)}"}
        
    if not request.chat_id: return {"result": "No chat ID provided."}
        
    try:
        chat_resp = supabase_client.table("chats").select("workspace_id").eq("id", request.chat_id).eq("user_id", user_uuid).execute()
        if not chat_resp.data: return {"result": "Chat not found or access denied."}
        workspace_id = chat_resp.data[0]["workspace_id"]
        
        user_node_id = None
        if not is_admin:
            member_resp = supabase_client.table("workspace_members").select("assigned_node_id").eq("workspace_id", workspace_id).eq("user_id", user_uuid).execute()
            if not member_resp.data: return {"result": "Access Denied"}
            user_node_id = member_resp.data[0]["assigned_node_id"]
    except Exception as e:
        return {"result": f"RBAC Error: {str(e)}"}
        
    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data: return {"result": "Workspace not found."}
        chart_data = response.data[0]
        nodes = json.loads(chart_data.get("nodes", [])) if isinstance(chart_data.get("nodes", []), str) else chart_data.get("nodes", [])
        edges = json.loads(chart_data.get("edges", [])) if isinstance(chart_data.get("edges", []), str) else chart_data.get("edges", [])
        
        node_ids = set([n.get("id") for n in nodes])
        if user_node_id not in node_ids and nodes:
            agent_nodes = [n for n in nodes if n.get("type") not in ["startNode", "endNode", "triggerNode", "conditionalNode"]]
            if len(agent_nodes) > 1:
                return {"result": "Missing Supervisor Node"}
            user_node_id = nodes[0].get("id")
    except Exception as e:
        return {"result": f"Error loading chat: {str(e)}"}
            
    DB_URI = os.environ.get("DATABASE_URL")
    
    def event_generator():
        try:
            with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
                memory = PostgresSaver(conn)
                memory.setup() 
                compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=user_node_id, memory=memory, workspace_id=workspace_id)
                
                initial_state = {
                    "messages": [HumanMessage(content=request.query)],
                    "context_variables": {"user": {"query": request.query}}
                }
                
                yield f'data: {json.dumps({"event": "start"})}\\n\\n'
                
                # Fetch execution streaming updates and messages
                for event_type, payload in compiled_graph.stream(initial_state, config=config, stream_mode=["updates", "messages"]):
                    if event_type == "messages":
                        # We get token chunks which include metadata about which node generated them
                        chunk, metadata = payload
                        node_name = metadata.get("langgraph_node", "unknown")
                        if node_name != "unknown":
                            msg_payload = {"event": "node_stream", "node": node_name}
                            yield f'data: {json.dumps(msg_payload)}\\n\\n'
                            
                    elif event_type == "updates":
                        # Node completely finished
                        node_name = list(payload.keys())[0] if payload else "unknown"
                        yield f'data: {json.dumps({"event": "node_update", "node": node_name})}\\n\\n'
                        
                yield f'data: {json.dumps({"event": "finish"})}\\n\\n'
        except Exception as e:
            yield f'data: {json.dumps({"event": "error", "message": str(e)})}\\n\\n'

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/chat/{workspace_id}/layout")
def get_secure_chat_layout(workspace_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        # Check if user is a superadmin
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
    except Exception as e:
        return {"error": f"Token error: {str(e)}"}
        
    try:
        user_node_id = None
        if not is_admin:
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
        
        if not user_node_id and is_admin and all_nodes:
            supervisor = next((n for n in all_nodes if n.get("id") == "supervisor"), None)
            if supervisor:
                user_node_id = "supervisor"
            else:
                user_node_id = all_nodes[0].get("id")
                
        return {
            "nodes": all_nodes,
            "edges": all_edges,
            "user_node_id": user_node_id
        }
    except Exception as e:
        return {"error": f"Error loading chat layout: {str(e)}"}

@router.get("/chat/{workspace_id}/thread/{thread_id}/state-history")
def get_state_history(workspace_id: str, thread_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"error": "Access Denied"}
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
    except Exception as e:
        return {"error": f"Token error: {str(e)}"}
        
    try:
        # Verify access
        chat_resp = supabase_client.table("chats").select("id").eq("id", thread_id).eq("workspace_id", workspace_id).eq("user_id", user_uuid).execute()
        if not chat_resp.data: return {"error": "Chat not found or access denied."}
    except Exception as e:
        return {"error": f"RBAC Error: {str(e)}"}

    DB_URI = os.environ.get("DATABASE_URL")
    try:
        with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
            memory = PostgresSaver(conn)
            memory.setup() 
            config = {"configurable": {"thread_id": thread_id}}
            
            history = list(memory.list(config)) # List of StateSnapshots
            
            formatted_history = []
            
            for state in history:
                curr_vals = state.values
                messages = curr_vals.get("messages", [])
                
                if not messages: continue
                last_msg = messages[-1]
                
                item = {
                    "checkpoint_id": state.config["configurable"]["checkpoint_id"],
                    "next_nodes": list(state.next),
                    "context_variables": curr_vals.get("context_variables", {})
                }
                
                if isinstance(last_msg, AIMessage):
                    item["type"] = "ai"
                    item["name"] = last_msg.name
                    item["content"] = last_msg.content
                    if getattr(last_msg, "tool_calls", None):
                        # Convert tool calls to dict to ensure JSON serializability
                        item["tool_calls"] = [{"name": t["name"], "args": t["args"]} for t in last_msg.tool_calls]
                elif isinstance(last_msg, HumanMessage):
                    item["type"] = "human"
                    item["content"] = last_msg.content
                elif isinstance(last_msg, ToolMessage):
                    item["type"] = "tool"
                    item["name"] = getattr(last_msg, "name", "tool")
                    item["content"] = last_msg.content
                    
                formatted_history.append(item)
                
            return {"history": formatted_history}
            
    except Exception as e:
        return {"error": f"Failed to fetch execution history: {str(e)}"}

    adjacency_list = {}
    node_ids = set([n.get("id") for n in all_nodes])
    
    if user_node_id not in node_ids and all_nodes:
        user_node_id = all_nodes[0].get("id")

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

@router.post("/chat/{workspace_id}/invite")
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
        
        default_password = get_system_setting("default_invite_password", "Tessera2026!")
        user_resp = supabase_client.auth.admin.create_user({"email": invite_req.email, "password": default_password, "email_confirm": True})
        new_user_id = user_resp.user.id
        
        ws_resp = supabase_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
        tenant_id = ws_resp.data[0]["tenant_id"] if ws_resp.data else None

        if tenant_id:
            supabase_client.table("tenant_members").insert({
                "tenant_id": tenant_id,
                "user_id": new_user_id,
                "tenant_role": "member"
            }).execute()

        role_resp = supabase_client.table("workspace_roles").select("id").eq("slug", invite_req.workspace_role).execute()
        role_id = role_resp.data[0]["id"] if role_resp.data else None

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

@router.get("/tenant/workspaces")
def get_tenant_workspaces(req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "): return {"workspaces": [], "error": "Access Denied"}
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        
        # Check if Superadmin (optional logging/bypass logic)
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        if is_admin and impersonated_tenant_id:
            resp = supabase_client.table("workspaces").select("id, name").eq("tenant_id", impersonated_tenant_id).order("updated_at", desc=True).execute()
            return {"success": True, "workspaces": resp.data}
        
        # Get user's active tenant(s). Even superadmins should only see workspaces for the tenant they are currently assigned/viewing context for to avoid cross-tenant pollution in the dropdown.
        tenant_member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
        
        if not tenant_member_resp.data:
            if is_admin:
                return {"success": True, "workspaces": []} # Admin with no tenant shouldn't see acme.
            return {"workspaces": [], "error": "No tenant associated with user."}
            
        # For simplicity if they belong to multiple, we can grab the first or all
        tenant_ids = [t['tenant_id'] for t in tenant_member_resp.data]
        
        # Get workspaces for those tenants
        resp = supabase_client.table("workspaces").select("id, name").in_("tenant_id", tenant_ids).order("updated_at", desc=True).execute()
        return {"success": True, "workspaces": resp.data}
        
    except Exception as e:
        return {"workspaces": [], "error": str(e)}
