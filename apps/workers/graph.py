import os
from typing import TypedDict, Literal
from dotenv import load_dotenv
from supabase import create_client, Client
from langgraph.graph import StateGraph, START, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# Load the environment variables from .env
load_dotenv()

# Initialize Database Client using the keys we just found
supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_service_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_service_key)

class GraphState(TypedDict):
    query: str
    route: str
    result: str

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)

def analyzer_node(state: GraphState):
    print(f"--- Analyzing: {state['query']} ---")
    system_prompt = SystemMessage(content='''
    You are an intelligent router.
    If the user asks about database records, users, profiles, or tenants, respond with EXACTLY the word "DATABASE".
    Otherwise, respond with EXACTLY the word "GENERAL".
    ''')
    response = llm.invoke([system_prompt, HumanMessage(content=state["query"])])
    route_decision = response.content.strip().upper()
    return {"route": route_decision}

def database_node(state: GraphState):
    """Executes a real read operation against the local Postgres database."""
    print("--- Fetching Real Database Records ---")
    
    try:
        # Fetch all rows from the profiles table
        response = supabase.table('profiles').select('*').execute()
        records = response.data
        
        # Format the SQL rows into a readable string for the graph state
        formatted_result = f"Found {len(records)} user profiles in the database:\n{records}"
        return {"result": formatted_result}
        
    except Exception as e:
        return {"result": f"Database Error: {str(e)}"}

def general_node(state: GraphState):
    print("--- Executing General AI ---")
    response = llm.invoke(state["query"])
    return {"result": response.content}

def route_query(state: GraphState) -> Literal["database_node", "general_node"]:
    if state["route"] == "DATABASE":
        return "database_node"
    return "general_node"

workflow = StateGraph(GraphState)

workflow.add_node("analyzer", analyzer_node)
workflow.add_node("database_node", database_node)
workflow.add_node("general_node", general_node)

workflow.add_edge(START, "analyzer")
workflow.add_conditional_edges("analyzer", route_query)
workflow.add_edge("database_node", END)
workflow.add_edge("general_node", END)

app_graph = workflow.compile()