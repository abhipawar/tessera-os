from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage
import jwt
import json
from typing import Optional

# Import the memory libraries
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool

from graph import app_graph  
from compiler import build_dynamic_graph

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv() 

supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client: Client = create_client(supabase_url, supabase_key)

app = FastAPI(title="Tessera Workers API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://tessera-os-web.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None  

@app.get("/health")
def health_check():
    return {"status": "Online"}

@app.post("/api/agent")
def run_agent(request: AgentRequest):
    initial_state = {"query": request.query, "route": "initialized", "result": ""}
    final_state = app_graph.invoke(initial_state)
    return final_state

# --- NEW ENDPOINT: Fetch Chat History ---
@app.get("/api/tenant-agent/history/{workspace_id}")
def get_workspace_history(workspace_id: str, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"messages": [], "error": "Access Denied: No valid authentication token provided."}
    
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        if not user_uuid:
            return {"messages": [], "error": "Invalid token."}
            
        thread_id = f"{user_uuid}_{workspace_id}"
        config = {"configurable": {"thread_id": thread_id}}
    except Exception as e:
        return {"messages": [], "error": f"Token error: {str(e)}"}
        
    # 1. FETCH GRAPH LAYOUT (We need the graph to accurately reconstruct the state)
    try:
        response = supabase_client.table("tenant_org_charts").select("nodes, edges").eq("id", workspace_id).execute()
        if not response.data:
            return {"messages": [], "error": "Workspace not found."}
            
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
    except Exception as e:
        return {"messages": [], "error": f"Error loading workspace: {str(e)}"}
        
    # 2. GET STATE FROM MEMORY
    DB_URI = os.environ.get("DATABASE_URL")
    try:
        with ConnectionPool(conninfo=DB_URI, kwargs={"prepare_threshold": None}) as pool:
            memory = PostgresSaver(pool)
            memory.setup() 
            
            # Compile the graph just so LangGraph knows how to parse the memory
            compiled_graph = build_dynamic_graph(nodes, edges, memory=memory)
            current_state = compiled_graph.get_state(config)
            
            all_messages = current_state.values.get("messages", []) if current_state.values else []
            
            # 3. FORMAT FOR THE FRONTEND
            chat_history = []
            for msg in all_messages:
                if isinstance(msg, HumanMessage):
                    chat_history.append({"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    chat_history.append({
                        "role": "ai", 
                        "content": msg.content,
                        "name": msg.name # We pass the agent's safe_name back so UI knows who spoke!
                    })
                    
            return {"messages": chat_history}
            
    except Exception as e:
        print(f"--- [History Endpoint] Error: {str(e)} ---")
        return {"messages": [], "error": f"Execution error: {str(e)}"}


# --- EXISTING POST ENDPOINT ---
@app.post("/api/tenant-agent")
def run_tenant_agent(request: AgentRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"result": "Access Denied: No valid authentication token provided."}
    
    token = auth_header.split(" ")[1]
    
    try:
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded_token.get("sub"))
        if not user_uuid:
            return {"result": "Invalid token."}
            
        thread_id = f"{user_uuid}_{request.workspace_id}"
        config = {"configurable": {"thread_id": thread_id}}
    except Exception as e:
        return {"result": f"Token error: {str(e)}"}
    
    if not request.workspace_id:
        return {"result": "No workspace ID provided."}
        
    try:
        response = supabase_client.table("tenant_org_charts").select("nodes, edges").eq("id", request.workspace_id).execute()
        if not response.data:
            return {"result": "Workspace not found."}
            
        chart_data = response.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
    except Exception as e:
        return {"result": f"Error loading workspace: {str(e)}"}
            
    print("\n--- [Execution Engine] Invoking Dynamic Graph ---")
    
    DB_URI = os.environ.get("DATABASE_URL")
    
    try:
        with ConnectionPool(conninfo=DB_URI, kwargs={"prepare_threshold": None}) as pool:
            memory = PostgresSaver(pool)
            memory.setup() 
            
            compiled_graph = build_dynamic_graph(nodes, edges, memory=memory)
            
            current_state = compiled_graph.get_state(config)
            existing_msg_count = len(current_state.values.get("messages", [])) if current_state.values else 0
            
            initial_state = {"messages": [HumanMessage(content=request.query)]}
            final_state = compiled_graph.invoke(initial_state, config=config)
            
            all_messages = final_state.get("messages", [])
            new_messages = all_messages[existing_msg_count + 1:] 
            
            ai_responses = [msg.content for msg in new_messages if isinstance(msg, AIMessage)]
            final_text = "\n\n".join(ai_responses) if ai_responses else "Task completed."
            
            return {"result": final_text}
            
    except Exception as e:
        print(f"--- [Execution Engine] Critical Error: {str(e)} ---")
        return {"result": f"Execution error: {str(e)}"}