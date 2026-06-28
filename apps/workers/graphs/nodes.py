import os
import re
import json
from typing import Annotated, TypedDict
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold
from langgraph.graph.message import add_messages
from supabase import create_client, Client
from dotenv import load_dotenv
from config_db import get_system_setting

load_dotenv()

supabase_url: str = os.environ.get("SUPABASE_URL", "")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase_client: Client = create_client(supabase_url, supabase_key) if supabase_url else None

def resolve_routing_collision(left: str, right: str) -> str:
    return right

def merge_dicts(left: dict, right: dict) -> dict:
    if not isinstance(left, dict): left = {}
    if not isinstance(right, dict): right = {}
    
    merged = left.copy()
    for k, v in right.items():
        if k in merged and isinstance(merged[k], dict) and isinstance(v, dict):
            merged[k] = merge_dicts(merged[k], v)
        else:
            merged[k] = v
    return merged

def resolve_templates(text: str, context: dict) -> str:
    """
    Looks for {{variable.path}} in `text` and replaces it with the value from `context`.
    Example: `{{trigger.payload.email}}` against `{"trigger": {"payload": {"email": "test@test.com"}}}`
    """
    if not text or not isinstance(text, str): return text
    
    def replacer(match):
        path = match.group(1).strip()
        keys = path.split('.')
        current = context
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return match.group(0) # Keep exact string {{x}} if not found
        
        # If the resolved variable is a dict/list, format it nicely, else stringify
        if isinstance(current, (dict, list)):
            return json.dumps(current, indent=2)
        return str(current)

    return re.sub(r'\{\{(.*?)\}\}', replacer, text)


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: Annotated[str, resolve_routing_collision]
    context_variables: Annotated[dict, merge_dicts]

def get_llm(llm_config: dict = None):
    if not llm_config:
        raise ValueError("No LLM configuration provided. Please connect an LLM integration (like OpenAI or Anthropic) in your Tenant Tools.")

    provider = llm_config.get("provider", "").lower()
    api_key = llm_config.get("api_key", "")
    model_name = llm_config.get("model_name")

    if not api_key or not model_name:
        raise ValueError(f"Incomplete LLM configuration for provider '{provider}'. Missing API key or model name.")

    if provider == "openai":
        return ChatOpenAI(model=model_name, api_key=api_key, temperature=0.0)
    elif provider == "anthropic":
        return ChatAnthropic(model=model_name, api_key=api_key, temperature=0.0)
    elif provider == "groq":
        return ChatGroq(model=model_name, api_key=api_key, temperature=0.0)
    else:
        # Defaults to google gemini if provider string matches or is unknown but valid key exists
        return ChatGoogleGenerativeAI(
            model=model_name, 
            api_key=api_key,
            temperature=0,
            safety_settings={
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )

def format_tool_output_fallback(content_str: str) -> str:
    import json
    import ast
    
    try:
        # Try evaluating as python dict literal or parsing as JSON
        try:
            data = json.loads(content_str)
        except:
            data = ast.literal_eval(content_str)
            
        if not isinstance(data, dict):
            return content_str
            
        # Extract the core data payload
        inner_data = data.get("data", data)
        if not isinstance(inner_data, dict):
            return content_str
            
        # Detect common lists of items
        # e.g., 'tables', 'repositories', 'projects', etc.
        list_key = None
        for k, v in inner_data.items():
            if isinstance(v, list):
                list_key = k
                break
                
        if list_key:
            items = inner_data[list_key]
            if not items:
                return f"No {list_key} found."
                
            # If they are dictionaries, make a clean summary table or bullet list
            if isinstance(items[0], dict):
                output = f"### Found {len(items)} {list_key.replace('_', ' ')}\n\n"
                for idx, item in enumerate(items, 1):
                    name = item.get("name") or item.get("full_name") or item.get("title") or item.get("id") or f"Item {idx}"
                    desc = item.get("description") or item.get("status") or ""
                    desc_str = f" - *{desc}*" if desc else ""
                    output += f"{idx}. **{name}**{desc_str}\n"
                return output
                
        return content_str
    except Exception:
        return content_str

def get_safe_string(content) -> str:
    if isinstance(content, str): 
        return content
    if isinstance(content, list): 
        extracted = []
        for item in content:
            if isinstance(item, dict) and "text" in item:
                extracted.append(str(item["text"]))
            elif isinstance(item, str):
                extracted.append(item)
            else:
                extracted.append(str(item))
        return " ".join(extracted)
    return str(content)

def create_worker_node(agent_name: str, system_prompt: str, tools: list, workspace_id: str, tenant_id: str, llm_config: dict = None, output_schema: dict = None):
    tool_map = {t.name: t for t in tools}
    
    def node_func(state: AgentState):
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name)
        print(f"\n--- [Execution Engine] Waking up Worker: {agent_name} ---")
        messages = state.get("messages", [])
        context_vars = state.get("context_variables", {})
        
        # Format the system prompt dynamically if templates exist
        resolved_sys_prompt = resolve_templates(system_prompt, context_vars) if system_prompt else ""
        background = f"BACKGROUND CONTEXT:\n{resolved_sys_prompt}\n\n" if resolved_sys_prompt else ""
        
        instructions = background + f"You are a helpful worker named {agent_name}."
        instructions += f"\n\nCRITICAL INSTRUCTION: You are part of a multi-agent team. You MUST provide a response ONLY from the perspective of '{agent_name}'."
        instructions += "\nSECURITY & ACCESS: You are an individual contributor. You do NOT have the ability to route messages."
        
        if tenant_id:
            instructions += f"\n\n🚨 CRITICAL TENANT ISOLATION REQUIREMENT: You are operating on behalf of a specific tenant. Their `tenant_id` is: {tenant_id}. If you ever need to craft SQL queries, filter APIs, or query databases that contain a `tenant_id` column, you MUST append a `WHERE tenant_id = '{tenant_id}'` clause to absolutely ensure you do not bleed data from other organizations!"
        
        llm = get_llm(llm_config)
        if tools:
            print(f"      -> [System] Binding {len(tools)} tools to Worker '{agent_name}'")
            instructions += "\n\nCRITICAL SYSTEM OVERRIDE: If your 'BACKGROUND CONTEXT' tells you to 'write' code or queries, you must ignore that limitation. Your true job is to EXECUTE them. You have been granted system tools. You MUST invoke these tools to answer questions. NEVER guess. NEVER just output the SQL code in your chat response. You must execute the tool, look at the returned data, and then answer the user!"
            instructions += "\n\nFORMATTING INSTRUCTION: Always present tool outputs, database lists, and execution results in a clean, human-readable markdown format (e.g. numbered lists, bullet points, headers, or markdown tables). Do NOT print raw JSON/dict objects or raw database schema strings unless specifically requested by the user."
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
            return {"messages": [HumanMessage(content=f"System Critical Error in '{agent_name}': {str(e)}\n\n*Did you forget to attach an AI Compute Engine to this workspace's Active Tools?*", name=safe_name)]}

        iterations = 0
        while response.tool_calls and iterations < 3:
            iterations += 1
            print(f"      -> [Tool Execution] '{agent_name}' decided to use tools (Iteration {iterations})!")
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
                        
                        if supabase_client and workspace_id:
                            try:
                                supabase_client.table("agent_execution_logs").insert({
                                    "workspace_id": workspace_id,
                                    "agent_name": agent_name,
                                    "tool_name": tool_name,
                                    "input_payload": tool_args,
                                    "output_preview": str(tool_result)[:2000],
                                    "status": "success"
                                }).execute()
                            except Exception as db_err:
                                print(f"         * [Telemetry Error] {db_err}")

                    else:
                        current_messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found.", tool_call_id=tool_call["id"]))
                except Exception as e:
                    current_messages.append(ToolMessage(content=f"Tool crash: {str(e)}", tool_call_id=tool_call["id"]))
                    if supabase_client and workspace_id:
                        try:
                            supabase_client.table("agent_execution_logs").insert({
                                "workspace_id": workspace_id,
                                "agent_name": agent_name,
                                "tool_name": tool_name,
                                "input_payload": tool_args,
                                "output_preview": str(e)[:2000],
                                "status": "error"
                             }).execute()
                        except: pass
            
            print(f"      -> [Tool Execution] Feeding data back to '{agent_name}'...")
            response = worker_llm.invoke([sys_msg] + current_messages)

        content = get_safe_string(response.content).strip()
        
        if not content:
            if current_messages and isinstance(current_messages[-1], ToolMessage):
                formatted_data = format_tool_output_fallback(current_messages[-1].content)
                content = f"I am {agent_name}. I executed my tool and retrieved the following:\n\n{formatted_data}"
            else:
                content = f"Hello, I am {agent_name}. I have processed your request."
            
        return {
            "messages": [HumanMessage(content=content, name=safe_name)],
            "context_variables": {safe_name: {"output": content}}
        }
    return node_func

class RoutingDecision(BaseModel):
    thought_process: str = Field(description="Your internal reasoning for why you are routing this task.")
    response: str = Field(description="The final message to display back to the user.")
    next_agent: str = Field(description="The name of the agent to route to, or 'FINISH' if you are done.")

def create_supervisor_node(agent_name: str, system_prompt: str, workers: list, tools: list, workspace_id: str, tenant_id: str, llm_config: dict = None):
    tool_map = {t.name: t for t in tools}
    
    def node_func(state: AgentState):
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name)
        messages = state.get("messages", [])
        context_vars = state.get("context_variables", {})
        worker_list_str = ", ".join(workers)
        
        resolved_sys_prompt = resolve_templates(system_prompt, context_vars) if system_prompt else ""
        background = f"BACKGROUND CONTEXT:\n{resolved_sys_prompt}\n\n" if resolved_sys_prompt else ""
        instructions = background + f"You are a manager named {agent_name}."
        
        if tenant_id:
            instructions += f"\n\n🚨 CRITICAL TENANT ISOLATION REQUIREMENT: You are operating on behalf of a specific tenant. Their `tenant_id` is: {tenant_id}. If you ever delegate tasks involving database queries or data lookup to your workers, you MUST remind them explicitly to filter their searches for this specific tenant_id to prevent cross-tenant data leaks!"

        instructions += f"\n\nCRITICAL INSTRUCTION: You manage this team: {worker_list_str}."
        instructions += f"\n1. IDENTITY: You are '{agent_name}'. NEVER impersonate your workers."
        
        if len(workers) == 1:
            instructions += f"\n2. SEQUENTIAL PIPELINE: You have exactly ONE downstream worker available: '{workers[0]}'. When you have finished processing data or handling your piece of the task, you MUST set 'next_agent' to '{workers[0]}' so they can continue the pipeline. Do NOT set 'next_agent' to 'FINISH' until '{workers[0]}' has executed."
        else:
            instructions += "\n2. CONVERSATION & DELEGATION: For general conversational questions or tasks you can do yourself (e.g., 'What is today's date?', 'Hello'), you MUST answer them directly in your 'response' and set 'next_agent' to 'FINISH'. ONLY delegate to workers if their specific highly-specialized expertise or private tools are strictly required."
            
        instructions += "\n3. SOLE COMMUNICATOR: You are the ONLY agent that speaks to the user. Workers operate silently in the background. When a worker returns data or a response, you MUST summarize or present their findings to the user. NEVER return an empty response after a worker has completed a task."
        instructions += f"\n4. ROSTER ENFORCEMENT: When delegating, you may ONLY route to your direct reports: [{worker_list_str}], or 'FINISH'. NEVER route to yourself."
        instructions += f"\n5. SECURITY & ACCESS: If the user asks you to interact with an agent or department that is NOT in your allowed roster ({worker_list_str}), you MUST politely inform them in your 'response' that you do not have access or authorization to communicate with that team, and set 'next_agent' to 'FINISH'."

        if tools:
            instructions += "\n6. EXTERNAL TOOLS: You have access to external tools. If the user asks for data that requires a tool, you MUST invoke the tool natively FIRST. Do NOT output your JSON routing block until AFTER you receive the tool results."

        instructions += "\n7. LOOP PREVENTION: If you have already delegated a task to a worker and they failed to provide a satisfactory answer, DO NOT delegate to them again. Instead, apologize to the user, summarize whatever data was returned, and set 'next_agent' to 'FINISH'."
        
        sys_msg = SystemMessage(content=instructions)
        llm = get_llm(llm_config)
        manager_llm = llm.bind_tools(tools) if tools else llm
        
        if tools: print(f"      -> [System] Binding {len(tools)} Dynamic Tools to Manager '{agent_name}'...")

        current_messages = messages.copy()
        
        # 1. First, we need to allow the Manager to natively run its own dynamic tools if provided.
        #    This happens exactly like a worker loop, using the raw untyped manager_llm (without structured output).
        try:
            response = manager_llm.invoke([sys_msg] + current_messages)
            
            iterations = 0
            while hasattr(response, "tool_calls") and response.tool_calls and iterations < 3:
                iterations += 1
                print(f"      -> [Tool Execution] Manager '{agent_name}' decided to use tools (Iteration {iterations})!")
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
                            
                            if supabase_client and workspace_id:
                                try:
                                    supabase_client.table("agent_execution_logs").insert({
                                        "workspace_id": workspace_id,
                                        "agent_name": agent_name,
                                        "tool_name": tool_name,
                                        "input_payload": tool_args,
                                        "output_preview": str(tool_result)[:2000],
                                        "status": "success"
                                    }).execute()
                                except Exception as db_err:
                                    print(f"         * [Telemetry Error] {db_err}")
                        else:
                            current_messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found.", tool_call_id=tool_call["id"]))
                    except Exception as e:
                        current_messages.append(ToolMessage(content=f"Tool crash: {str(e)}", tool_call_id=tool_call["id"]))
                        if supabase_client and workspace_id:
                            try:
                                supabase_client.table("agent_execution_logs").insert({
                                    "workspace_id": workspace_id,
                                    "agent_name": agent_name,
                                    "tool_name": tool_name,
                                    "input_payload": tool_args,
                                    "output_preview": str(e)[:2000],
                                    "status": "error"
                                }).execute()
                            except: pass
                
                print(f"      -> [Tool Execution] Feeding data back to '{agent_name}' for JSON routing decision...")
                # We do NOT use the structured routing loop here so the LLM can freely think about the tools
                response = manager_llm.invoke([sys_msg] + current_messages)
            
            # 2. Finally, once all tools successfully complete (or if none were needed),
            #    we explicitly bind `.with_structured_output` to force it to return a valid pydantic graph edge object
            print(f"\n--- [Execution Engine] Supervisor '{agent_name}' is thinking... ---")
            routing_llm = llm.with_structured_output(RoutingDecision)
            final_routing_response = routing_llm.invoke([sys_msg] + current_messages)
            
            thought = final_routing_response.thought_process
            resp_text = final_routing_response.response
            next_agt = final_routing_response.next_agent
            
            print(f"      -> Thought: {thought}")
            print(f"      -> Decided to route to: {next_agt}")
            
        except Exception as e:
            print(f"\n--- [SUPERVISOR CRASH] '{agent_name}' failed: {str(e)} ---")
            return {
                "messages": [AIMessage(content=f"System Critical Error in Manager '{agent_name}': {str(e)}\n\n*Did you forget to attach an AI Compute Engine to this workspace's Active Tools?*", name=safe_name)],
                "next_agent": "FINISH"
            } 
        
        resp_text = resp_text.strip()
        out_context = {safe_name: {"output": resp_text}}
        
        if not resp_text or resp_text.upper() == "FINISH" or resp_text == "None":
            return {"next_agent": next_agt, "context_variables": out_context}
            
        return {
            "messages": [AIMessage(content=resp_text, name=safe_name)],
            "next_agent": next_agt,
            "context_variables": out_context
        }
    return node_func
