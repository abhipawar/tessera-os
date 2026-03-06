from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
import email
from email.policy import default
import logging
import os
from supabase import create_client

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

class InboundEmailPayload(BaseModel):
    from_email: str = Field(alias="from", default="")
    to: str = ""
    raw_mime: str = ""

@router.post("/inbound-email")
async def handle_inbound_email(payload: InboundEmailPayload, req: Request):
    # 1. Security Check (Optional but recommended for production edge workers)
    secret = req.headers.get("X-Webhook-Secret")
    # For now, we'll just log if it's missing, but in prod you would enforce this:
    # if secret != "tessera-os-cloud-worker-secret-key":
    #     raise HTTPException(status_code=401, detail="Unauthorized webhook caller")

    # 2. Parse the MIME payload
    msg = email.message_from_string(payload.raw_mime, policy=default)
    subject = msg.get("Subject", "No Subject")
    
    # Safely recurse through multipart emails to extract the plain-text body
    # We strip out HTML to prevent confusing the LLM with styling tags
    body_text = ""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                try:
                    body_text = part.get_payload(decode=True).decode()
                    break
                except:
                    pass
    else:
        try:
            body_text = msg.get_payload(decode=True).decode()
        except:
            body_text = msg.get_payload()
            
    if not body_text:
        body_text = "[No plain text body found in email]"

    # 3. Determine Routing (Extract Agent ID / Workspace ID)
    # E.g., agent_sales@tesseraos.ai -> 'sales'
    to_address = payload.to.strip().lower()
    local_part = to_address.split("@")[0]
    
    # Strip exactly 'agent_' from the start if it exists to retrieve the raw semantic prefix
    if local_part.startswith("agent_"):
        local_part = local_part[6:]
    
    logging.info(f"📧 INBOUND EMAIL ROUTER:")
    logging.info(f"From: {payload.from_email}")
    logging.info(f"To: {payload.to}")
    logging.info(f"Subject: {subject}")
    logging.info(f"Body Preview: {body_text[:100]}...")

    # Validate that we have Supabase connected
    if not supabase_client:
        logging.error("Missing Supabase credentials in worker environment.")
        return {"status": "error", "message": "Database not configured"}

    # --- LANGGRAPH INVOCATION LOGIC ---
    try:
        # 1. Lookup the routing rule directly from the database
        route_resp = supabase_client.table("inbound_email_routes").select("workspace_id, node_id").eq("semantic_email_prefix", local_part).eq("is_active", True).execute()
        
        if not route_resp.data:
            logging.warning(f"No active email route found for prefix: {local_part}")
            return {"status": "dropped", "message": "No matching route found for destination address."}
            
        workspace_id = route_resp.data[0]["workspace_id"]
        target_node_id = route_resp.data[0]["node_id"]
        
        # 2. Fetch the graph configuration for the target workspace
        ws_resp = supabase_client.table("workspaces").select("nodes, edges").eq("id", workspace_id).execute()
        if not ws_resp.data:
            return {"status": "error", "message": "Associated workspace is missing or invalid."}
            
        import json
        chart_data = ws_resp.data[0]
        raw_nodes, raw_edges = chart_data.get("nodes", []), chart_data.get("edges", [])
        nodes = json.loads(raw_nodes) if isinstance(raw_nodes, str) else raw_nodes
        edges = json.loads(raw_edges) if isinstance(raw_edges, str) else raw_edges
        
        # 3. Format the Email as a HumanMessage
        formatted_prompt = f"New Email Received from {payload.from_email}\n\nSubject: {subject}\n\nBody:\n{body_text}"
        
        # 4. Invoke the Graph (Synchronously for this edge worker response)
        from compiler import build_dynamic_graph
        from langchain_core.messages import HumanMessage
        from langgraph.checkpoint.postgres import PostgresSaver
        import psycopg
        
        DB_URI = os.environ.get("DATABASE_URL")
        with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
            memory = PostgresSaver(conn)
            memory.setup() 
            
            # We use semantic prefix + sender email to isolate conversation threads securely
            thread_id = f"email_{local_part}_{payload.from_email}"
            config = {"configurable": {"thread_id": thread_id}}
            
            # Build the graph specifically zeroing in on the target node
            compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=target_node_id, memory=memory, workspace_id=workspace_id)
            
            initial_state = {
                "messages": [HumanMessage(content=formatted_prompt)],
                "context_variables": {"user": {"query": formatted_prompt}}
            }
            
            # Write to Communication Logs Table
            try:
                supabase_client.table("agent_communications").insert({
                    "workspace_id": workspace_id,
                    "direction": "inbound",
                    "from_email": payload.from_email,
                    "to_email": payload.to,
                    "subject": subject,
                    "body": body_text
                }).execute()
            except Exception as log_e:
                logging.warning(f"Failed to securely log inbound email: {str(log_e)}")

            logging.info(f"🚀 Waking up Agent Node '{target_node_id}' in Workspace '{workspace_id}' to process email...")
            final_state = compiled_graph.invoke(initial_state, config=config)
            
            logging.info(f"✅ Agent '{target_node_id}' successfully executed email logic.")
            
    except Exception as e:
        logging.error(f"Error executing LangGraph pipeline for incoming email: {e}")
        return {"status": "error", "message": str(e)}

    return {"status": "success", "message": "Email ingested, parsed, routed, and executed by Agent."}
