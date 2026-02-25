import re
import json
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold
import os
from dotenv import load_dotenv

from tools import AVAILABLE_TOOLS

load_dotenv()

def resolve_routing_collision(left: str, right: str) -> str:
    return right

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: Annotated[str, resolve_routing_collision]

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", 
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

def create_worker_node(agent_name: str, system_prompt: str):
    def node_func(state: AgentState):
        print(f"\n--- [Execution Engine] Waking up Worker: {agent_name} ---")
        messages = state.get("messages", [])
        
        background = f"BACKGROUND CONTEXT:\n{system_prompt}\n\n" if system_prompt else ""
        instructions = background + f"You are a helpful worker named {agent_name}."
        instructions += f"\n\nCRITICAL INSTRUCTION: You are part of a multi-agent team. You MUST provide a response ONLY from the perspective of '{agent_name}'. Do not speak for other members. If you recently introduced yourself, do NOT do it again."
        instructions += "\nCRITICAL: You must NEVER output a blank string. Always write a response."
        
        sys_msg = SystemMessage(content=instructions)
        
        worker_llm = llm
        if "Data Analyst" in agent_name:
            worker_llm = llm.bind_tools(list(AVAILABLE_TOOLS.values()))

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
                    if tool_name in AVAILABLE_TOOLS:
                        tool_func = AVAILABLE_TOOLS[tool_name]
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

def create_supervisor_node(agent_name: str, system_prompt: str, workers: list):
    schema_instruction = """
    FINAL ROUTING DECISION:
    When you are ready to route, you MUST output ONLY a valid JSON object.
    {
        "thought_process": "Briefly explain your reasoning.",
        "response": "Your spoken response to the user. Tell them the data you found! Use an empty string \\"\\" if you have already spoken.",
        "next_agent": "Choose EXACTLY ONE from the allowed team roster, or 'FINISH'."
    }
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
        
        has_tools = "Data Analyst" in agent_name
        if has_tools:
            instructions += "\n4. EXTERNAL TOOLS: You have access to database tools. If the user asks for data, you MUST invoke the tool natively FIRST. Do NOT output your JSON routing block until AFTER you receive the tool results."

        instructions += f"\n\n{schema_instruction}"
        
        sys_msg = SystemMessage(content=instructions)
        
        manager_llm = llm
        if has_tools:
            print(f"      -> [System] Binding SQL Tools to Manager '{agent_name}'...")
            manager_llm = llm.bind_tools(list(AVAILABLE_TOOLS.values()))

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
                        if tool_name in AVAILABLE_TOOLS:
                            tool_result = AVAILABLE_TOOLS[tool_name].invoke(tool_args)
                            print(f"         * Tool Result: {str(tool_result)[:100]}...")
                            current_messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_call["id"]))
                        else:
                            current_messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found.", tool_call_id=tool_call["id"]))
                    except Exception as e:
                        current_messages.append(ToolMessage(content=f"Tool crash: {str(e)}", tool_call_id=tool_call["id"]))
                
                print(f"      -> [Tool Execution] Feeding data back to '{agent_name}' for JSON routing decision...")
                response = manager_llm.invoke([sys_msg] + current_messages)

            content_str = get_safe_string(response.content).strip()
            
            # THE BULLETPROOF FALLBACK
            if not content_str:
                print(f"\n--- [Execution Engine] '{agent_name}' returned empty text. Auto-routing to FINISH. ---")
                content_str = '{"thought_process": "I had nothing to say.", "response": "", "next_agent": "FINISH"}'

            match = re.search(r'\{.*\}', content_str, re.DOTALL)
            if not match:
                print(f"--- [WARNING] No JSON found. Raw output: {content_str} ---")
                content_str = '{"thought_process": "JSON parse failed.", "response": "", "next_agent": "FINISH"}'
                match = re.search(r'\{.*\}', content_str, re.DOTALL)
                
            parsed_data = json.loads(match.group(0))
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
        resp_text = re.split(r"\n?\*\*\[", resp_text)[0].strip()
        
        if not resp_text or resp_text.upper() == "FINISH" or resp_text == "None":
            return {"next_agent": next_agt}
            
        formatted_response = f"**[{agent_name}]**: {resp_text}"
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', agent_name)
        
        return {
            "messages": [AIMessage(content=formatted_response, name=safe_name)],
            "next_agent": next_agt
        }
    return node_func

def build_dynamic_graph(nodes: list, edges: list, memory=None):
    print("\n--- [Compiler] Assembling Hub-and-Spoke Digital Twin ---")
    
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

    supervisor_id = nodes[0].get("id") if nodes else None
    for node in nodes:
        if node.get("id") == "supervisor":
            supervisor_id = node.get("id")

    for node in nodes:
        node_id = node.get("id")
        label = node_id_to_label[node_id]
        sys_prompt = node.get("data", {}).get("systemPrompt", "")
        
        if node_id in manager_to_workers:
            worker_labels = [node_id_to_label[w_id] for w_id in manager_to_workers[node_id]]
            node_function = create_supervisor_node(label, sys_prompt, worker_labels)
        else:
            node_function = create_worker_node(label, sys_prompt)
            
        builder.add_node(label, node_function)

    if supervisor_id:
        top_supervisor_label = node_id_to_label[supervisor_id]
        builder.add_edge(START, top_supervisor_label)

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
        finish_target = node_id_to_label[parent_id] if parent_id else END
        
        routing_map = {w: w for w in worker_labels}
        routing_map["FINISH_ROUTING"] = finish_target 
        
        builder.add_conditional_edges(mgr_label, create_router(worker_labels), routing_map)
        
        for w_id in worker_ids:
            w_label = node_id_to_label[w_id]
            if w_id not in manager_to_workers:
                builder.add_edge(w_label, mgr_label)

    print("--- [Compiler] Compilation Complete! ---\n")
    return builder.compile(checkpointer=memory)