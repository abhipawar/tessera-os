import os
from typing import TypedDict, Literal, Annotated, Optional
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode, tools_condition, InjectedState
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.tools import tool
from e2b_code_interpreter import Sandbox

# 1. IMPORT OPENAI AND PORTKEY (The Universal Gateway)
from langchain_openai import ChatOpenAI
from portkey_ai import createHeaders, PORTKEY_GATEWAY_URL

load_dotenv()

supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_anon_key: str = os.environ.get("SUPABASE_ANON_KEY")

# 2. DEFINE THE TOOLS
@tool
def run_python_code(code: str) -> str:
    """Executes python code in a secure cloud sandbox and returns the terminal output. 
    Use this to do complex math, process data, or write custom scripts to solve the user's problem."""
    print("\n--- [E2B Sandbox] Spinning up MicroVM ---")
    print(f"Code to execute:\n{code}\n")

    try:
        with Sandbox.create() as sandbox:
            execution = sandbox.run_code(code)
            
            if execution.error:
                print(f"--- [E2B Sandbox] Code Error: {execution.error.name} ---")
                return f"Error: {execution.error.name}: {execution.error.value}\n{execution.error.traceback}"
            
            output_blocks = []
            if execution.logs.stdout: output_blocks.append("\n".join(execution.logs.stdout))
            if execution.logs.stderr: output_blocks.append("\n".join(execution.logs.stderr))
            if execution.text and not execution.logs.stdout: output_blocks.append(execution.text)
            if execution.results:
                for result in execution.results:
                    if result.text: output_blocks.append(result.text)

            final_result = "\n".join(output_blocks).strip()
            print(f"--- [E2B Sandbox] Execution Successful. Output length: {len(final_result)} chars ---")
            return final_result if final_result else "Code executed successfully with no output."
            
    except Exception as e:
        print(f"!!! [E2B FATAL EXCEPTION] {str(e)} !!!")
        return f"Sandbox infrastructure exception: {str(e)}"

@tool
def mutate_database(
    table: str, 
    operation: Literal["insert", "update"], 
    payload: dict, 
    state: Annotated[dict, InjectedState],
    match_column: str = "", 
    match_value: str = ""
) -> str:
    """Executes a secure database mutation (INSERT or UPDATE) on behalf of the user.
    Args:
        table: Name of the database table.
        operation: 'insert' or 'update'.
        payload: A dictionary containing the column names and values to write.
        match_column: For updates, the column to match on (e.g., 'email').
        match_value: For updates, the specific value to match on.
    """
    print(f"\n--- [Database Mutation] Attempting {operation.upper()} on table '{table}' ---")
    print(f"[Debug] Payload: {payload}")
    
    token = state.get("token")
    if not token:
        print("[Debug] Error: No JWT token found in state.")
        return "System Error: Missing JWT token for authentication."
        
    try:
        # Initialize Supabase with the specific user's JWT to enforce RLS
        options = ClientOptions(headers={'Authorization': f"Bearer {token}"})
        user_client: Client = create_client(supabase_url, supabase_anon_key, options=options)
        
        if operation == "insert":
            response = user_client.table(table).insert(payload).execute()
            print(f"--- [Database Mutation] Insert Complete. Rows affected: {len(response.data)} ---")
            return f"Insert Successful: {response.data}"
            
        elif operation == "update":
            print(f"[Debug] Matching where: {match_column} = {match_value}")
            if not match_column or not match_value:
                return "Error: Database updates require a match_column and match_value."
                
            response = user_client.table(table).update(payload).eq(match_column, match_value).execute()
            print(f"--- [Database Mutation] Update Complete. Rows affected: {len(response.data)} ---")
            
            # If 0 rows were updated, it means the RLS policy blocked it, or the row didn't exist!
            if len(response.data) == 0:
                print("!!! [Database Mutation] WARNING: 0 rows updated. Blocked by RLS or row not found. !!!")
                return "Update executed but 0 rows were changed. You may not have permission, or the record does not exist."
                
            return f"Update Successful: {response.data}"
        else:
            return f"Error: Unsupported operation {operation}."
            
    except Exception as e:
        print(f"!!! [Database Mutation Error] {str(e)} !!!")
        return f"Database Mutation Error: {str(e)}"

# 3. CONFIGURE THE PORTKEY UNIVERSAL GATEWAY (BYOK Architecture)
portkey_headers = createHeaders(
    api_key=os.environ.get("PORTKEY_API_KEY"),
    provider="google"
)

llm = ChatOpenAI(
    api_key=os.environ.get("GOOGLE_API_KEY"), 
    base_url=PORTKEY_GATEWAY_URL,
    default_headers=portkey_headers,
    model="gemini-2.5-flash",
    temperature=0,
)

# BIND BOTH TOOLS TO THE LLM
tools = [run_python_code, mutate_database]
llm_with_tools = llm.bind_tools(tools)

class TenantState(TypedDict):
    query: str
    messages: Annotated[list, add_messages]
    token: str
    route: str
    result: str

def analyzer_node(state: TenantState):
    print(f"--- [Tenant Workspace] Analyzing Intent ---")
    system_prompt = SystemMessage(content='''
    You are an intelligent routing assistant. 
    If the user asks to fetch, read, or get their database records, respond with EXACTLY "DATABASE".
    Otherwise, respond with EXACTLY "GENERAL".
    ''')
    response = llm.invoke([system_prompt, HumanMessage(content=state['query'])])
    return {"route": response.content.strip().upper()}

def database_node(state: TenantState):
    print("--- [Tenant Workspace] Fetching RLS-Secured Records ---")
    try:
        options = ClientOptions(headers={'Authorization': f"Bearer {state['token']}"})
        user_client: Client = create_client(supabase_url, supabase_anon_key, options=options)
        response = user_client.table('profiles').select('*').execute()
        records = response.data
        
        # --- NEW DEBUG LINE ---
        print(f"CRITICAL DEBUG - DATABASE RETURNED: {records}")
        
        db_data = f"[System DB Tool Output] RLS Query Successful. Fetched records:\n{records}"
        return {"messages": [SystemMessage(content=db_data)]}
    except Exception as e:
        print(f"CRITICAL DEBUG - DATABASE ERROR: {str(e)}")
        return {"messages": [SystemMessage(content=f"[System DB Tool] Secure Database Error: {str(e)}")]}
        
def general_node(state: TenantState):
    print("--- [Tenant Workspace] Executing AI (Reasoning & Tool Calling) ---")
    
    instruction = SystemMessage(content='''
    You are Tessera, a secure enterprise AI worker. 
    
    CRITICAL INSTRUCTION REGARDING DATABASE READS:
    Do NOT say you cannot read the database. The system architecture automatically performs secure database reads on your behalf.
    Look immediately at the message history provided to you. The user's secure database records (including their email, ID, and account role) have ALREADY been fetched and injected into your context. 
    You MUST read that injected data and use it to answer the user's question directly. 
    
    If asked to update or insert data, you have permission to use the mutate_database tool.
    ''')
    
    messages_to_send = [instruction] + state["messages"]
    response = llm_with_tools.invoke(messages_to_send)
    
    raw_content = response.content
    if isinstance(raw_content, list):
        text_blocks = [block.get("text", "") for block in raw_content if isinstance(block, dict) and "text" in block]
        clean_string = "\n".join(text_blocks)
    else:
        clean_string = str(raw_content)
    
    result_text = clean_string if not response.tool_calls else "Agent is executing a tool..."
    
    return {"result": result_text, "messages": [response]}
    
def route_query(state: TenantState) -> Literal["database_node", "general_node"]:
    if state["route"] == "DATABASE":
        return "database_node"
    return "general_node"

# 4. BUILD THE REACT GRAPH LOOP
workflow = StateGraph(TenantState)

workflow.add_node("analyzer", analyzer_node)
workflow.add_node("database_node", database_node)
workflow.add_node("general_node", general_node)
workflow.add_node("tools", ToolNode(tools))

workflow.add_edge(START, "analyzer")
workflow.add_conditional_edges("analyzer", route_query)
workflow.add_edge("database_node", "general_node")
workflow.add_conditional_edges("general_node", tools_condition)
workflow.add_edge("tools", "general_node") 

memory = MemorySaver()
tenant_app_graph = workflow.compile(checkpointer=memory)