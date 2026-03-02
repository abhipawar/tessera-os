import os
import json
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import Command
import psycopg
from supabase import create_client
from dotenv import load_dotenv
from compiler import build_dynamic_graph
from langchain_core.messages import HumanMessage

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/api/async", tags=["async"])

class TriggerRequest(BaseModel):
    workspace_id: str
    event_type: str 
    payload: Dict[str, Any]

class ResolutionRequest(BaseModel):
    action: str # "approve" or "reject"
    feedback: Optional[str] = None

@router.post("/trigger")
def trigger_workspace_async(req: TriggerRequest):
    """
    Entry point for Cron jobs or Webhooks to wake up a workspace graph asynchronously.
    """
    workspace_id = req.workspace_id
    
    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data: 
            return {"error": "Workspace not found."}
            
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
    except Exception as e:
        return {"error": f"Error loading workspace topology: {str(e)}"}

    # Find the Trigger Node
    trigger_node = next((n for n in nodes if n.get("type") == "triggerNode"), None)
    if not trigger_node:
        return {"error": "No Trigger Node (entry point) found in this workspace."}
        
    start_node_id = trigger_node.get("id")

    # Generate a unique thread ID for this async execution
    import uuid
    thread_id = f"async_{uuid.uuid4().hex}"
    config = {"configurable": {"thread_id": thread_id}}
    
    DB_URI = os.environ.get("DATABASE_URL")
    try:
        with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
            memory = PostgresSaver(conn)
            memory.setup() 
            
            # Note: For async, user_node_id is the trigger node
            compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=start_node_id, memory=memory, workspace_id=workspace_id)
            
            initial_message = f"ASYNC EVENT RECEIVED [{req.event_type}]:\n{json.dumps(req.payload, indent=2)}"
            initial_state = {
                "messages": [HumanMessage(content=initial_message)],
                "context_variables": {"trigger": {"payload": req.payload}}
            }
            
            # We use stream() to catch any Interrupts thrown by ApprovalNodes
            events = compiled_graph.stream(initial_state, config=config)
            
            interrupted = False
            for event in events:
                if "__interrupt__" in event:
                    interrupted = True
                    interrupt_data = event["__interrupt__"][0].value
                    
                    # Create the pending task in the database for the HITL queue
                    supabase_client.table("agent_tasks").insert({
                        "workspace_id": workspace_id,
                        "thread_id": thread_id,
                        "agent_id": interrupt_data.get("node", "Unknown Approval Node"),
                        "payload": {
                            "context": interrupt_data.get("messages", []),
                            "event_source": req.event_type,
                            "original_payload": req.payload
                        },
                        "status": "pending_approval"
                    }).execute()
                    
                    print(f"--- [Async Engine] Graph paused for Human-in-the-Loop on thread {thread_id} ---")
                    break
                    
            if not interrupted:
                 print(f"--- [Async Engine] Graph execution completed automatically on thread {thread_id} ---")
            
            return {
                "success": True, 
                "thread_id": thread_id, 
                "status": "pending_approval" if interrupted else "completed"
            }
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Execution error: {str(e)}"}

@router.post("/tasks/{task_id}/resolve")
def resolve_pending_task(task_id: str, req: ResolutionRequest):
    """
    Endpoint for a human admin/user to resume a paused graph execution.
    """
    if req.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
        
    # Fetch the pending task
    task_resp = supabase_client.table("agent_tasks").select("*").eq("id", task_id).execute()
    if not task_resp.data:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task = task_resp.data[0]
    if task["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail="Task is no longer pending approval")
        
    workspace_id = task["workspace_id"]
    thread_id = task["thread_id"]
    
    # Reload Graph
    try:
        response = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data: return {"error": "Workspace not found."}
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
    except Exception as e:
        return {"error": f"Error loading chat: {str(e)}"}
        
    # Hack: We need a valid user_node_id to compile the graph, even when resuming.
    # In a real system we'd track the exact entry node, but for now we find any valid start node.
    user_node = next((n for n in nodes if n.get("type") in ["triggerNode", "userNode", "customUser"]), None)
    if not user_node: user_node = nodes[0]

    config = {"configurable": {"thread_id": thread_id}}
    DB_URI = os.environ.get("DATABASE_URL")
    
    try:
        with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
            memory = PostgresSaver(conn)
            memory.setup() 
            
            compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=user_node.get("id"), memory=memory, workspace_id=workspace_id)
            
            # Send the Command to resume the interrupted graph state with the action payload
            events = compiled_graph.stream(Command(resume=req.action), config=config)
            
            interrupted = False
            for event in events:
                if "__interrupt__" in event:
                    interrupted = True
                    # If it hits ANOTHER approval node organically
                    interrupt_data = event["__interrupt__"][0].value
                    
                    # Create a NEW pending task
                    supabase_client.table("agent_tasks").insert({
                        "workspace_id": workspace_id,
                        "thread_id": thread_id,
                        "agent_id": interrupt_data.get("node", "Unknown Approval Node"),
                        "payload": task["payload"], # Carry forward context
                        "status": "pending_approval"
                    }).execute()
                    break

            # Update original task status
            supabase_client.table("agent_tasks").update({
                "status": "approved" if req.action == "approve" else "rejected"
            }).eq("id", task_id).execute()
            
            return {
                "success": True, 
                "status": "pending_approval" if interrupted else "completed"
            }
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Execution error: {str(e)}"}
