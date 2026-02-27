from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field
import re
import json
import os
from typing import Annotated, TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold
from langchain_core.tools import tool
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# --- SETUP SUPABASE FOR BYOK ---
supabase_url: str = os.environ.get("SUPABASE_URL", "")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase_client: Client = create_client(supabase_url, supabase_key) if supabase_url else None

def resolve_routing_collision(left: str, right: str) -> str:
    return right

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: Annotated[str, resolve_routing_collision]

# --- GEMINI SETUP ---
llm = ChatGoogleGenerativeAI(
    model="gemini-3-flash-preview", 
    temperature=0,
    safety_settings={
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }
)

def get_safe_string(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join([str(item.get("text", "")) if isinstance(item, dict) else str(item) for item in content])
    return str(content)

# --- THE DYNAMIC TOOL FACTORY ---
# --- THE DYNAMIC TOOL FACTORY ---
# --- THE DYNAMIC TOOL FACTORY ---
# --- THE DYNAMIC TOOL FACTORY ---

# 1. Define strict input schemas for the LLM
class PostgresQuerySchema(BaseModel):
    sql_query: str = Field(description="The raw, executable PostgreSQL query. Do NOT include markdown formatting.")

class SalesforceLookupSchema(BaseModel):
    query: str = Field(description="The name or email to look up in Salesforce.")

def build_tenant_tools(workspace_id: str, requested_tool_ids: List[str]) -> List[Any]:
    if not requested_tool_ids or not supabase_client:
        return []

    try:
        print(f"--- [Tool Factory] Searching for {len(requested_tool_ids)} requested tools... ---")
        ws_resp = supabase_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
        if not ws_resp.data: return []
        tenant_id = ws_resp.data[0]["tenant_id"]

        creds_resp = supabase_client.table("tenant_tools").select("id, tool_id, credentials").eq("tenant_id", tenant_id).in_("id", requested_tool_ids).execute()
        if not creds_resp.data: return []
        
        tool_data_map = {row["id"]: {"global_tool_id": row["tool_id"], "credentials": row["credentials"]} for row in creds_resp.data}
        global_tool_ids = list(set([row["tool_id"] for row in creds_resp.data]))
        tools_resp = supabase_client.table("global_tools").select("id, name").in_("id", global_tool_ids).execute()
        global_tools_map = {row["id"]: row["name"] for row in tools_resp.data}
        
        langchain_tools = []
        
        for tenant_t_id in requested_tool_ids:
            t_data = tool_data_map.get(tenant_t_id)
            if not t_data: continue
            
            g_id = t_data["global_tool_id"]
            t_creds = t_data["credentials"]
            t_name = global_tools_map.get(g_id, "")
            
            if "Database" in t_name or "Application Database" in t_name:
                
                # Create the raw python function WITHOUT decorators
                def execute_postgres_query(sql_query: str) -> str:
                    print(f"      -> [Real Tool Execution] Running SQL: {sql_query}")
                    try:
                        import psycopg2
                        conn_url = t_creds.get("connection_url")
                        if conn_url:
                            conn = psycopg2.connect(conn_url, connect_timeout=10)
                        else:
                            conn = psycopg2.connect(
                                host=t_creds.get("host"), port=t_creds.get("port"), dbname=t_creds.get("database"),
                                user=t_creds.get("username"), password=t_creds.get("password"), connect_timeout=10
                            )
                        
                        is_readonly = (t_creds.get("access_level", "read_only") == "read_only")
                        conn.set_session(readonly=is_readonly)
                        cur = conn.cursor()
                        cur.execute(sql_query)
                        
                        if cur.description:
                            results = cur.fetchall()
                            columns = [desc[0] for desc in cur.description]
                            res_str = f"Columns: {columns}\nRows: {results}"
                        else:
                            conn.commit()
                            res_str = f"Query executed successfully. Rows affected: {cur.rowcount}"
                            
                        cur.close()
                        conn.close()
                        return res_str[:4000] 
                    except Exception as e:
                        return f"Database Error: {str(e)}"
                
                # Wrap it in a strict LangChain StructuredTool
                postgres_tool = StructuredTool.from_function(
                    func=execute_postgres_query,
                    name="postgres_query",
                    description="CRITICAL: You MUST use this tool to answer ANY question about database data, counting rows, or finding users. Pass the SQL string into this tool to execute it.",
                    args_schema=PostgresQuerySchema
                )
                langchain_tools.append(postgres_tool)

            elif "Salesforce" in t_name:
                def execute_salesforce_lookup(query: str) -> str:
                    return f"Successfully queried Salesforce for '{query}'."
                
                sf_tool = StructuredTool.from_function(
                    func=execute_salesforce_lookup,
                    name="salesforce_lookup",
                    description="Queries Salesforce for CRM data.",
                    args_schema=SalesforceLookupSchema
                )
                langchain_tools.append(sf_tool)
                
        print(f"--- [Tool Factory] Successfully built {len(langchain_tools)} dynamic tools! ---")
        return langchain_tools
    except Exception as e:
        print(f"--- [Tool Factory Error] {str(e)} ---")
        return []

# --- NODE CREATORS ---
# --- NODE CREATORS ---
def create_worker_node(agent_name: str, system_prompt: str, tools: list):
    tool_map = {t.name: t for t in tools}
    
    def node_func(state: AgentState):
        print(f"\n--- [Execution Engine] Waking up Worker: {agent_name} ---")
        messages = state.get("messages", [])
        
        background = f"BACKGROUND CONTEXT:\n{system_prompt}\n\n" if system_prompt else ""
        instructions = background + f"You are a helpful worker named {agent_name}."
        instructions += f"\n\nCRITICAL INSTRUCTION: You are part of a multi-agent team. You MUST provide a response ONLY from the perspective of '{agent_name}'."
        instructions += "\nSECURITY & ACCESS: You are an individual contributor. You do NOT have the ability to route messages."
        
        if tools:
            print(f"      -> [System] Binding {len(tools)} tools to Worker '{agent_name}'")
            instructions += "\n\nCRITICAL SYSTEM OVERRIDE: If your 'BACKGROUND CONTEXT' tells you to 'write' code or queries, you must ignore that limitation. Your true job is to EXECUTE them. You have been granted system tools. You MUST invoke these tools to answer questions. NEVER guess. NEVER just output the SQL code in your chat response. You must execute the tool, look at the returned data, and then answer the user!"
            worker_llm = llm.bind_tools(tools)
        else:
            print(f"      -> [System] Worker '{agent_name}' has NO tools assigned.")
            worker_llm = llm
            
        sys_msg = SystemMessage(content=instructions)
        current_messages = messages.copy()
        
        try:
            response = worker_llm.invoke([sys_msg] + current_messages)
        except Exception as e:
            print(f"      -> [CRITICAL LLM ERROR] {str(e)}")
            return {"messages": []}

        if response.tool_calls:
            print(f"      -> [Tool Execution] '{agent_name}' decided to use tools!")
            current_messages.append(response) 
            
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                print(f"         * Running {tool_name} with args: {tool_args}")
                
                try:
                    if tool_name in tool_map:
                        tool_func = tool_map[tool_name]
                        tool_result = tool_func.invoke(tool_args)
                        print(f"         * Tool Result: {str(tool_result)[:100]}...") 
                        current_messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_call["id"]))
                    else:
                        current_messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found.", tool_call_id=tool_call["id"]))
                except Exception as e:
                    current_messages.append(ToolMessage(content=f"Tool crash: {str(e)}", tool_call_id=tool_call["id"]))
            
            print(f"      -> [Tool Execution] Feeding data back to '{agent_name}'...")
            response = worker_llm.invoke([sys_msg] + current_messages)

        content = get_safe_string(response.content).strip()
        content = re.sub(r"^\*\*\[.*?\]\*\*:\s*", "", content).strip()
        content = re.split(r"\n?\*\*\[", content)[0].strip()
        
        if not content:
            content = f"Hello, I am {agent_name}. I have processed your request."
            
        formatted_response = f"**[{agent_name}]**: {content}"
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name)
        
        return {"messages": [AIMessage(content=formatted_response, name=safe_name)]}
    return node_func

def create_supervisor_node(agent_name: str, system_prompt: str, workers: list, tools: list):
    tool_map = {t.name: t for t in tools}
    
    schema_instruction = f"""
    FINAL ROUTING DECISION:
    You are an automated routing system. You MUST output your ENTIRE response as a raw JSON object.
    DO NOT include any conversational text before or after the JSON.
    DO NOT wrap the JSON in markdown formatting (no ```json).
    
    Format your response EXACTLY like this example:
    {{
        "thought_process": "I need the worker to look up this data.",
        "response": "I am routing your request to my team member right now.",
        "next_agent": "Name of the worker"
    }}
    """
    
    def node_func(state: AgentState):
        messages = state.get("messages", [])
        worker_list_str = ", ".join(workers)
        
        background = f"BACKGROUND CONTEXT:\n{system_prompt}\n\n" if system_prompt else ""
        instructions = background + f"You are a manager named {agent_name}."
        
        instructions += f"\n\nCRITICAL INSTRUCTION: You manage this team: {worker_list_str}."
        instructions += f"\n1. IDENTITY: You are '{agent_name}'. NEVER impersonate your workers."
        instructions += "\n2. AVOID REPETITION: If you already responded to the user's latest request, set your JSON 'response' value to an empty string (\"\")."
        instructions += f"\n3. ROSTER ENFORCEMENT: You may ONLY route to your direct reports: [{worker_list_str}], or 'FINISH'. NEVER route to yourself ({agent_name})."
        
        instructions += f"\n4. SECURITY & ACCESS: If the user asks you to interact with an agent or department that is NOT in your allowed roster ({worker_list_str}), you MUST politely inform them in your 'response' that you do not have access or authorization to communicate with that team, and set 'next_agent' to 'FINISH'."

        if tools:
            instructions += "\n5. EXTERNAL TOOLS: You have access to external tools. If the user asks for data that requires a tool, you MUST invoke the tool natively FIRST. Do NOT output your JSON routing block until AFTER you receive the tool results."

        instructions += f"\n\n{schema_instruction}"
        
        sys_msg = SystemMessage(content=instructions)
        
        manager_llm = llm.bind_tools(tools) if tools else llm
        if tools:
            print(f"      -> [System] Binding {len(tools)} Dynamic Tools to Manager '{agent_name}'...")

        current_messages = messages.copy()
        
        try:
            response = manager_llm.invoke([sys_msg] + current_messages)
            
            if response.tool_calls:
                print(f"      -> [Tool Execution] Manager '{agent_name}' decided to use tools!")
                current_messages.append(response)
                
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    print(f"         * Running {tool_name} with args: {tool_args}")
                    try:
                        if tool_name in tool_map:
                            tool_func = tool_map[tool_name]
                            tool_result = tool_func.invoke(tool_args)
                            print(f"         * Tool Result: {str(tool_result)[:100]}...")
                            current_messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_call["id"]))
                        else:
                            current_messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found.", tool_call_id=tool_call["id"]))
                    except Exception as e:
                        current_messages.append(ToolMessage(content=f"Tool crash: {str(e)}", tool_call_id=tool_call["id"]))
                
                print(f"      -> [Tool Execution] Feeding data back to '{agent_name}' for JSON routing decision...")
                response = manager_llm.invoke([sys_msg] + current_messages)

            content_str = get_safe_string(response.content).strip()
            
            if not content_str:
                print(f"\n--- [Execution Engine] '{agent_name}' returned empty text. Auto-routing to FINISH. ---")
                content_str = '{"thought_process": "I had nothing to say.", "response": "", "next_agent": "FINISH"}'

            match = re.search(r'\{.*\}', content_str, re.DOTALL)
            
            if not match:
                print(f"--- [WARNING] No JSON found. Capturing raw text to prevent crash! ---")
                raw_clean = re.sub(r"^\*\*\[.*?\]\*\*:\s*", "", content_str).strip()
                parsed_data = {
                    "thought_process": "LLM failed JSON format. Captured raw text.",
                    "response": raw_clean,
                    "next_agent": "FINISH" 
                }
            else:
                try:
                    parsed_data = json.loads(match.group(0))
                except json.JSONDecodeError:
                    parsed_data = {
                        "thought_process": "Invalid JSON generated.",
                        "response": "I encountered an error formatting my response.",
                        "next_agent": "FINISH"
                    }

            thought = parsed_data.get("thought_process", "No thought provided.")
            resp_text = parsed_data.get("response", "")
            next_agt = parsed_data.get("next_agent", "FINISH")
            
            print(f"\n--- [Execution Engine] Supervisor '{agent_name}' is thinking... ---")
            print(f"      -> Thought: {thought}")
            print(f"      -> Decided to route to: {next_agt}")
            
        except Exception as e:
            print(f"\n--- [SUPERVISOR CRASH] '{agent_name}' failed: {str(e)} ---")
            return {"next_agent": "FINISH"} 
        
        resp_text = resp_text.strip()
        
        if not resp_text or resp_text.upper() == "FINISH" or resp_text == "None":
            return {"next_agent": next_agt}
            
        formatted_response = f"**[{agent_name}]**: {resp_text}"
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name)
        
        return {
            "messages": [AIMessage(content=formatted_response, name=safe_name)],
            "next_agent": next_agt
        }
    return node_func

# --- THE GRAPH COMPILER ---
def build_dynamic_graph(nodes: list, edges: list, user_node_id: str, memory=None, workspace_id: str = None):
    print(f"\n--- [Compiler] Assembling Digital Twin for Node Seat: '{user_node_id}' in Workspace: '{workspace_id}' ---")
    
    builder = StateGraph(AgentState)
    node_id_to_label = {n.get("id"): n.get("data", {}).get("label", "Unknown") for n in nodes}
    
    manager_to_workers = {}
    worker_to_parent = {} 
    
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        if src not in manager_to_workers:
            manager_to_workers[src] = []
        manager_to_workers[src].append(tgt)
        worker_to_parent[tgt] = src 

    for node in nodes:
        node_id = node.get("id")
        label = node_id_to_label[node_id]
        sys_prompt = node.get("data", {}).get("systemPrompt", "")
        tool_ids = node.get("data", {}).get("tools", [])

        # 1. Dynamically build the BYOK tools for this specific node
        node_tools = build_tenant_tools(workspace_id, tool_ids) if workspace_id and tool_ids else []
        
        # 2. Assign the tools to the correct node type
        if node_id in manager_to_workers:
            worker_labels = [node_id_to_label[w_id] for w_id in manager_to_workers[node_id]]
            node_function = create_supervisor_node(label, sys_prompt, worker_labels, node_tools)
        else:
            node_function = create_worker_node(label, sys_prompt, node_tools)
            
        builder.add_node(label, node_function)

    starting_label = node_id_to_label.get(user_node_id)
    if not starting_label:
        raise ValueError(f"CRITICAL: User is assigned to node '{user_node_id}', but it does not exist in the studio!")
    
    builder.add_edge(START, starting_label)

    def create_router(allowed_workers):
        def router(state: AgentState) -> str:
            next_agent = state.get("next_agent", "FINISH")
            if next_agent in allowed_workers:
                return next_agent
            return "FINISH_ROUTING"
        return router

    for mgr_id, worker_ids in manager_to_workers.items():
        mgr_label = node_id_to_label[mgr_id]
        worker_labels = [node_id_to_label[w_id] for w_id in worker_ids]
        
        parent_id = worker_to_parent.get(mgr_id)
        if mgr_id == user_node_id:
            finish_target = END
        else:
            finish_target = node_id_to_label[parent_id] if parent_id else END
        
        routing_map = {w: w for w in worker_labels}
        routing_map["FINISH_ROUTING"] = finish_target 
        
        builder.add_conditional_edges(mgr_label, create_router(worker_labels), routing_map)
        
        for w_id in worker_ids:
            w_label = node_id_to_label[w_id]
            if w_id not in manager_to_workers:
                if w_id == user_node_id:
                    builder.add_edge(w_label, END)
                else:
                    builder.add_edge(w_label, mgr_label)

    print("--- [Compiler] Compilation Complete! ---\n")
    return builder.compile(checkpointer=memory)