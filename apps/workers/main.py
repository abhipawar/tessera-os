from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

# Import both of our compiled graphs
from graph import app_graph  
from tenant_graph import tenant_app_graph

app = FastAPI(title="Tessera Workers API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
    "https://tessera-os-web.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    query: str

@app.get("/health")
def health_check():
    return {
        "status": "Agentic Workers Online", 
        "message": "Connection successful: FastAPI is talking to Next.js!"
    }

# The Admin Route (God Mode)
@app.post("/api/agent")
def run_agent(request: AgentRequest):
    initial_state = {"query": request.query, "route": "initialized", "result": ""}
    final_state = app_graph.invoke(initial_state)
    return final_state

# The Tenant Route (Strict RLS + Memory)
@app.post("/api/tenant-agent")
async def run_tenant_agent(request: AgentRequest, req: Request):
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return {"result": "Access Denied: No valid authentication token provided."}
    
    token = auth_header.split(" ")[1]
    
    # 1. We use the last 15 characters of the user's secure token as their unique memory Thread ID
    thread_id = token[-15:]
    config = {"configurable": {"thread_id": thread_id}}
    
    # 2. Add the user's prompt as a HumanMessage so the graph checkpointer can log it
    initial_state = {
        "query": request.query,
        "messages": [HumanMessage(content=request.query)],
        "token": token,
        "route": "initialized",
        "result": ""
    }
    
    # 3. Invoke the graph, passing the config that contains the Thread ID
    final_state = tenant_app_graph.invoke(initial_state, config=config)
    
    # 4. Clean up the payload before sending it to the frontend
    final_state.pop("token", None)
    final_state.pop("messages", None) # We remove this so the raw Python objects don't break JSON serialization
    
    return final_state