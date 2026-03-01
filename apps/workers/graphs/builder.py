from langgraph.graph import StateGraph, START, END
from graphs.nodes import AgentState, create_worker_node, create_supervisor_node
from graphs.tools import build_tenant_tools
import os
from supabase import create_client
from crypto import decrypt_credentials

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

        node_tools = build_tenant_tools(workspace_id, tool_ids) if workspace_id and tool_ids else []
        
        llm_config = None
        llm_engine_id = node.get("data", {}).get("llm_engine")
        llm_model = node.get("data", {}).get("llm_model")
        
        if llm_engine_id:
            try:
                sb_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
                tt_res = sb_client.table("tenant_tools").select("credentials").eq("id", llm_engine_id).execute()
                if tt_res.data:
                    llm_config = decrypt_credentials(tt_res.data[0]["credentials"])
                    if llm_model:
                        llm_config["model_name"] = llm_model
            except Exception as e:
                print(f"--- [Compiler] Error loading LLM config for node {label}: {e} ---")
        
        if node_id in manager_to_workers:
            worker_labels = [node_id_to_label[w_id] for w_id in manager_to_workers[node_id]]
            node_function = create_supervisor_node(label, sys_prompt, worker_labels, node_tools, workspace_id, llm_config)
        else:
            node_function = create_worker_node(label, sys_prompt, node_tools, workspace_id, llm_config)
            
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
