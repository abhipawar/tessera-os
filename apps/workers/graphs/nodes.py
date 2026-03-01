import os
import re
import json
from typing import Annotated, TypedDict
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold
from langgraph.graph.message import add_messages
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_url: str = os.environ.get("SUPABASE_URL", "")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase_client: Client = create_client(supabase_url, supabase_key) if supabase_url else None

def resolve_routing_collision(left: str, right: str) -> str:
    return right

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: Annotated[str, resolve_routing_collision]

def get_llm(llm_config: dict = None):
    provider = "google gemini"
    api_key = os.environ.get("GEMINI_API_KEY", "")
    model_name = "gemini-1.5-flash"

    if llm_config:
        provider = llm_config.get("provider", "google gemini").lower()
        api_key = llm_config.get("api_key", api_key)
        model_name = llm_config.get("model_name", model_name)

    if provider == "openai":
        return ChatOpenAI(model=model_name or "gpt-4o", api_key=api_key, temperature=0.0)
    elif provider == "anthropic":
        return ChatAnthropic(model_name=model_name or "claude-3-5-sonnet-20241022", api_key=api_key, temperature=0.0)
    elif provider == "groq":
        return ChatGroq(model=model_name or "llama-3.1-70b-versatile", api_key=api_key, temperature=0.0)
    else:
        return ChatGoogleGenerativeAI(
            model=model_name or "gemini-1.5-flash", 
            api_key=api_key,
            temperature=0,
            safety_settings={
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )

def get_safe_string(content) -> str:
    if isinstance(content, str): return content
    if isinstance(content, list): return " ".join([str(item.get("text", "")) if isinstance(item, dict) else str(item) for item in content])
    return str(content)

def create_worker_node(agent_name: str, system_prompt: str, tools: list, workspace_id: str, llm_config: dict = None):
    tool_map = {t.name: t for t in tools}
    
    def node_func(state: AgentState):
        print(f"\n--- [Execution Engine] Waking up Worker: {agent_name} ---")
        messages = state.get("messages", [])
        
        background = f"BACKGROUND CONTEXT:\n{system_prompt}\n\n" if system_prompt else ""
        instructions = background + f"You are a helpful worker named {agent_name}."
        instructions += f"\n\nCRITICAL INSTRUCTION: You are part of a multi-agent team. You MUST provide a response ONLY from the perspective of '{agent_name}'."
        instructions += "\nSECURITY & ACCESS: You are an individual contributor. You do NOT have the ability to route messages."
        
        llm = get_llm(llm_config)
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
            content = f"Hello, I am {agent_name}. I have processed your request."
            
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name)
        
        return {"messages": [AIMessage(content=content, name=safe_name)]}
    return node_func

def create_supervisor_node(agent_name: str, system_prompt: str, workers: list, tools: list, workspace_id: str, llm_config: dict = None):
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
        llm = get_llm(llm_config)
        manager_llm = llm.bind_tools(tools) if tools else llm
        
        if tools: print(f"      -> [System] Binding {len(tools)} Dynamic Tools to Manager '{agent_name}'...")

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
            
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name)
        
        return {
            "messages": [AIMessage(content=resp_text, name=safe_name)],
            "next_agent": next_agt
        }
    return node_func
